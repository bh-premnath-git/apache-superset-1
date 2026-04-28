import React, { useCallback, useMemo, useState } from 'react';
import { scaleSqrt } from 'd3-scale';
import { CategoricalColorNamespace } from '@superset-ui/core';

import { Breadcrumb } from './Breadcrumb';
import type { BreadcrumbSegment } from './Breadcrumb';
import { DistrictPie } from './DistrictPie';
import { Legend } from './Legend';
import { StateLayer } from './StateLayer';
import { Tooltip } from './Tooltip';
import {
  DEFAULT_CATEGORY_COLORS,
  FALLBACK_PALETTE,
} from '../constants';
import { featureCentroids } from '../geo/centroids';
import { fitProjection } from '../geo/projection';
import { useGeoJson } from '../hooks/useGeoJson';
import type {
  DistrictRow,
  GeoFeature,
  GeoFeatureCollection,
  StateAggregate,
  StateDistrictPiesProps,
} from '../types';

/**
 * Orchestrates the two async geojson fetches and the SVG composition.
 *
 * We keep this component thin by design: every visual concern lives in a
 * dedicated child component (StateLayer / DistrictPie / Legend / Tooltip),
 * every data concern lives in a hook or helper. The job of this component
 * is layout + hover state only.
 */
export default function StateDistrictPies(props: StateDistrictPiesProps) {
  const {
    width,
    height,
    districts,
    stateTotals,
    stateGeoJsonUrl,
    districtGeoJsonUrl,
    stateFeatureKeyProp,
    districtFeatureKeyProp,
    colorScheme,
    minPieRadius,
    maxPieRadius,
    showLegend,
    showTooltip,
    onDistrictClick,
  } = props;

  const stateGeo = useGeoJson(stateGeoJsonUrl);
  const districtGeo = useGeoJson(districtGeoJsonUrl);
  const districtBaseGeo = districtGeo.data ?? stateGeo.data;

  const resolvedStateFeatureKeyProp = useMemo(() => {
    if (!stateGeo.data) return stateFeatureKeyProp;
    const totalsKeys = new Set(stateTotals.map(s => normalizeKey(s.stateKey)));
    const candidates = [
      stateFeatureKeyProp,
      'NAME_1',
      'ST_NM',
      'state_name',
      'STATE',
      'name',
    ];

    let bestProp = stateFeatureKeyProp;
    let bestMatched = -1;
    let bestUnique = -1;

    for (const prop of candidates) {
      if (!prop) continue;
      const values = stateGeo.data.features
        .map(f => String(f.properties?.[prop] ?? '').trim())
        .filter(Boolean);
      if (!values.length) continue;

      const unique = new Set(values.map(normalizeKey));
      const matched = Array.from(unique).filter(v => totalsKeys.has(v)).length;

      // Prefer high match with stateTotals; if nothing matches, still prefer
      // a property with many unique values (avoids constant keys like ISO=IND).
      if (
        unique.size > 1 &&
        (matched > bestMatched || (matched === bestMatched && unique.size > bestUnique))
      ) {
        bestMatched = matched;
        bestUnique = unique.size;
        bestProp = prop;
      }
    }

    return bestProp;
  }, [stateGeo.data, stateFeatureKeyProp, stateTotals]);

  const resolvedDistrictFeatureKeyProp = useMemo(() => {
    if (!districtBaseGeo) return districtFeatureKeyProp;
    const districtKeys = new Set(districts.map(d => normalizeKey(d.districtKey)));
    const candidates = [
      'NAME_2',
      'DISTRICT',
      'district',
      districtFeatureKeyProp,
      'DIST_CODE',
      'censuscode',
      'name',
    ];

    const priority = new Map<string, number>([
      ['NAME_2', 6],
      ['DISTRICT', 5],
      ['district', 4],
      [districtFeatureKeyProp, 3],
      ['name', 2],
      ['DIST_CODE', 1],
      ['censuscode', 0],
    ]);

    let bestProp = districtFeatureKeyProp;
    let bestMatched = -1;
    let bestUnique = -1;
    let bestPriority = -1;

    for (const prop of candidates) {
      if (!prop) continue;
      const values = districtBaseGeo.features
        .map(f => String(f.properties?.[prop] ?? '').trim())
        .filter(Boolean);
      if (!values.length) continue;

      const unique = new Set(values.map(normalizeKey));
      const matched = Array.from(unique).filter(v => districtKeys.has(v)).length;
      const currentPriority = priority.get(prop) ?? 0;
      if (
        unique.size > 1 &&
        (
          matched > bestMatched ||
          (matched === bestMatched && unique.size > bestUnique) ||
          (matched === bestMatched && unique.size === bestUnique && currentPriority > bestPriority)
        )
      ) {
        bestMatched = matched;
        bestUnique = unique.size;
        bestPriority = currentPriority;
        bestProp = prop;
      }
    }

    return bestProp;
  }, [districtBaseGeo, districtFeatureKeyProp, districts]);

  const indiaStateTotals = useMemo<StateAggregate[]>(() => {
    const uniqueStateTotals = new Set(stateTotals.map(s => normalizeKey(s.stateKey)));
    // If incoming state totals are already meaningful, trust them.
    if (uniqueStateTotals.size > 1) return stateTotals;
    if (!districtBaseGeo) return stateTotals;

    const districtToState = new Map<string, string>();
    for (const f of districtBaseGeo.features) {
      const district = String(f.properties?.[resolvedDistrictFeatureKeyProp] ?? '').trim();
      const state = String(f.properties?.[resolvedStateFeatureKeyProp] ?? '').trim();
      if (!district || !state) continue;
      districtToState.set(normalizeKey(district), state);
    }

    const byState = new Map<string, number>();
    for (const d of districts) {
      const inferredState = districtToState.get(normalizeKey(d.districtKey));
      if (!inferredState) continue;
      byState.set(inferredState, (byState.get(inferredState) ?? 0) + d.totalWeight);
    }

    const inferred = Array.from(byState.entries()).map(([stateKey, totalWeight]) => ({
      stateKey,
      totalWeight,
    }));

    if (inferred.length > 0) {
      return inferred;
    }

    return stateTotals;
  }, [
    stateTotals,
    districtBaseGeo,
    resolvedDistrictFeatureKeyProp,
    resolvedStateFeatureKeyProp,
    districts,
  ]);

  // ---- Drill-down state ------------------------------------------------
  type DrillLevel = 'india' | 'state' | 'district';
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('india');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  // ---- Filter GeoJSON based on drill level -----------------------------
  const filteredGeo = useMemo((): GeoFeatureCollection | undefined => {
    if (!stateGeo.data) return undefined;
    if (drillLevel === 'india') {
      // At India level we still pass all district features for fill-coloring
      // by state; strokes are suppressed via strokeMode='state-outline'.
      return stateGeo.data;
    }

    if (!districtBaseGeo) return undefined;
    const allFeatures = districtBaseGeo.features;

    if (drillLevel === 'state' && selectedState) {
      return {
        type: 'FeatureCollection',
        features: allFeatures.filter(
          f => normalizeKey(String(f.properties?.[resolvedStateFeatureKeyProp] ?? ''))
               === normalizeKey(selectedState),
        ),
      };
    }
    if (drillLevel === 'district' && selectedDistrict) {
      return {
        type: 'FeatureCollection',
        features: allFeatures.filter(
          f => normalizeKey(String(f.properties?.[resolvedDistrictFeatureKeyProp] ?? ''))
               === normalizeKey(selectedDistrict),
        ),
      };
    }
    return districtBaseGeo;
  }, [stateGeo.data, drillLevel, selectedState, selectedDistrict,
      districtBaseGeo, resolvedStateFeatureKeyProp, resolvedDistrictFeatureKeyProp]);

  // ---- Dissolved state outlines for India level -------------------------
  // Group district features by state key → one MultiPolygon per state, so
  // the outline layer draws clean state boundaries without district noise.
  const dissolvedStateGeo = useMemo((): GeoFeatureCollection | undefined => {
    if (!stateGeo.data) return undefined;
    const groups = new Map<string, number[][][][]>();
    const propKey = resolvedStateFeatureKeyProp;
    for (const f of stateGeo.data.features) {
      const key = String(f.properties?.[propKey] ?? '').trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      const geom = f.geometry;
      if (geom.type === 'Polygon') {
        groups.get(key)!.push(geom.coordinates as number[][][]);
      } else if (geom.type === 'MultiPolygon') {
        groups.get(key)!.push(...(geom.coordinates as number[][][][]));
      }
    }
    const features: GeoFeature[] = Array.from(groups.entries()).map(
      ([key, coords]) => ({
        type: 'Feature' as const,
        properties: { [propKey]: key },
        geometry: { type: 'MultiPolygon' as const, coordinates: coords },
      }),
    );
    return { type: 'FeatureCollection', features };
  }, [stateGeo.data, resolvedStateFeatureKeyProp]);

  // ---- Totals and key-prop change per level ----------------------------
  const layerKeyProp = drillLevel === 'india'
    ? resolvedStateFeatureKeyProp
    : resolvedDistrictFeatureKeyProp;

  const layerTotals: StateAggregate[] = useMemo(() => {
    if (drillLevel === 'india') return indiaStateTotals;
    const relevant = selectedState
      ? districts.filter(d => normalizeKey(d.stateKey) === normalizeKey(selectedState))
      : districts;
    return relevant.map(d => ({ stateKey: d.districtKey, totalWeight: d.totalWeight }));
  }, [drillLevel, selectedState, indiaStateTotals, districts]);

  // ---- Navigation callbacks --------------------------------------------
  const goToIndia = useCallback(() => {
    setDrillLevel('india');
    setSelectedState(null);
    setSelectedDistrict(null);
  }, []);

  const goToState = useCallback(() => {
    setDrillLevel('state');
    setSelectedDistrict(null);
  }, []);

  const handleFeatureClick = useCallback((featureKey: string) => {
    if (drillLevel === 'india') {
      setSelectedState(featureKey);
      setDrillLevel('state');
    } else if (drillLevel === 'state') {
      setSelectedDistrict(featureKey);
      setDrillLevel('district');
    }
  }, [drillLevel]);

  const handleDistrictPieClick = useCallback((row: DistrictRow) => {
    if (drillLevel === 'state') {
      setSelectedDistrict(row.districtKey);
      setDrillLevel('district');
    }
    onDistrictClick?.(row);
  }, [drillLevel, onDistrictClick]);

  // ---- Breadcrumb segments ---------------------------------------------
  const breadcrumbs: BreadcrumbSegment[] = useMemo(() => {
    const segs: BreadcrumbSegment[] = [
      { label: 'India', onClick: drillLevel !== 'india' ? goToIndia : undefined },
    ];
    if (selectedState) {
      segs.push({
        label: selectedState,
        onClick: drillLevel === 'district' ? goToState : undefined,
      });
    }
    if (selectedDistrict) {
      segs.push({ label: selectedDistrict });
    }
    return segs;
  }, [drillLevel, selectedState, selectedDistrict, goToIndia, goToState]);

  // ---- Derived geometry ------------------------------------------------
  const colorFor = useMemo(
    () => buildColorAccessor(districts, colorScheme),
    [districts, colorScheme],
  );

  const geometry = useMemo(() => {
    if (!filteredGeo) return undefined;
    return fitProjection(filteredGeo, width, height);
  }, [filteredGeo, width, height]);

  const districtCentroids = useMemo(() => {
    // At India level, skip pies — too cluttered on the full map.
    if (drillLevel === 'india') return [];
    if (!geometry || !filteredGeo) return [];
    const centroids = featureCentroids(filteredGeo, geometry.path, resolvedDistrictFeatureKeyProp);
    return centroids;
  }, [drillLevel, geometry, filteredGeo, resolvedDistrictFeatureKeyProp]);

  const radiusScale = useMemo(() => {
    const maxWeight = districts.reduce((m, r) => Math.max(m, r.totalWeight), 0);
    return scaleSqrt()
      .domain([0, maxWeight || 1])
      .range([minPieRadius, maxPieRadius]);
  }, [districts, minPieRadius, maxPieRadius]);

  const districtsByKey = useMemo(() => {
    const map = new Map<string, DistrictRow>();
    for (const d of districts) map.set(normalizeKey(d.districtKey), d);
    return map;
  }, [districts]);

  const [hover, setHover] = useState<{
    row: DistrictRow | null;
    x: number;
    y: number;
  }>({ row: null, x: 0, y: 0 });

  const handleHover = useCallback(
    (row: DistrictRow | null, x: number, y: number) =>
      setHover(prev => (prev.row === row ? prev : { row, x, y })),
    [],
  );

  if (stateGeo.error || districtGeo.error) {
    return (
      <ErrorPanel
        width={width}
        height={height}
        message={(stateGeo.error ?? districtGeo.error)?.message ?? 'GeoJSON fetch failed'}
      />
    );
  }

  // Distinguish "no URL configured" from "fetch in flight". Without this,
  // an empty/missing URL leaves stateGeo as { loading: false, data: undef }
  // and the chart would render "Loading map…" forever with no network
  // request — confusing operators chasing a broken chart.
  if (!stateGeoJsonUrl) {
    return (
      <ErrorPanel
        width={width}
        height={height}
        message="State GeoJSON URL is not configured for this chart."
      />
    );
  }

  if (stateGeo.loading || districtGeo.loading || !filteredGeo || !geometry) {
    return <StatusPanel width={width} height={height} message="Loading map…" />;
  }

  const categories = uniqueCategories(districts);
  const showPies = drillLevel !== 'india';

  return (
    <div
      className="sdp-root"
      style={{ position: 'relative', width, height, color: '#222' }}
    >
      <Breadcrumb segments={breadcrumbs} />

      <svg
        width={width}
        height={height}
        role="img"
        aria-label="India state and district map"
      >
        <StateLayer
          geo={filteredGeo}
          path={geometry.path}
          stateFeatureKeyProp={layerKeyProp}
          stateTotals={layerTotals}
          onFeatureClick={drillLevel !== 'district' ? handleFeatureClick : undefined}
          strokeMode={drillLevel === 'india' ? 'state-outline' : 'default'}
          stateOutlineGeo={drillLevel === 'india' ? dissolvedStateGeo : undefined}
        />
        {showPies && (
          <g className="sdp-district-layer">
            {districtCentroids.map(centroid => {
              const row = districtsByKey.get(normalizeKey(centroid.key));
              if (!row) return null;
              return (
                <DistrictPie
                  key={centroid.key}
                  row={row}
                  cx={centroid.cx}
                  cy={centroid.cy}
                  radius={radiusScale(row.totalWeight) * 0.72}
                  colorFor={colorFor}
                  onClick={handleDistrictPieClick}
                  onHover={showTooltip ? handleHover : undefined}
                />
              );
            })}
          </g>
        )}
      </svg>

      {showTooltip && (
        <Tooltip
          row={hover.row}
          x={hover.x}
          y={hover.y}
          containerWidth={width}
          colorFor={colorFor}
        />
      )}

      {showLegend && <Legend categories={categories} colorFor={colorFor} />}
    </div>
  );
}

/**
 * GADM GeoJSON uses older / Hindi-transliterated names for some districts;
 * the analytics DB uses current Census names.  This alias map lets both
 * sides resolve to the same canonical key.
 */
const DISTRICT_ALIASES: Record<string, string> = {
  'purba champaran': 'east champaran',
  'pashchim champaran': 'west champaran',
  'bhabua': 'kaimur',
  'purba singhbhum': 'east singhbhum',
  'pashchim singhbhum': 'west singhbhum',
  'hazaribag': 'hazaribagh',
  'saraikela kharsawan': 'saraikela-kharsawan',
  'east nimar': 'khandwa',
  'west nimar': 'khargone',
};

function normalizeKey(s: string): string {
  const key = s.toLowerCase().trim();
  return DISTRICT_ALIASES[key] ?? key;
}

function uniqueCategories(rows: DistrictRow[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) for (const w of r.wedges) seen.add(w.category);
  return Array.from(seen);
}

function buildColorAccessor(
  districts: DistrictRow[],
  colorScheme?: string,
): (category: string) => string {
  const categories = uniqueCategories(districts);
  const scheme = colorScheme
    ? CategoricalColorNamespace.getScale(colorScheme)
    : undefined;
  return (category: string) => {
    const override = DEFAULT_CATEGORY_COLORS[category];
    if (override) return override;
    if (scheme) return scheme(category);
    const idx = categories.indexOf(category);
    return FALLBACK_PALETTE[idx >= 0 ? idx % FALLBACK_PALETTE.length : 0];
  };
}

function StatusPanel({
  width,
  height,
  message,
}: {
  width: number;
  height: number;
  message: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: 13,
      }}
      role="status"
    >
      {message}
    </div>
  );
}

function ErrorPanel({
  width,
  height,
  message,
}: {
  width: number;
  height: number;
  message: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        color: '#b00020',
        fontSize: 13,
        textAlign: 'center',
      }}
      role="alert"
    >
      {message}
    </div>
  );
}
