import React, { useCallback, useMemo, useState } from 'react';
import { scaleSqrt } from 'd3-scale';
import { CategoricalColorNamespace } from '@superset-ui/core';

import { Breadcrumb } from './Breadcrumb';
import { DistrictDetailView } from './DistrictDetailView';
import { DistrictPie } from './DistrictPie';
import { Legend } from './Legend';
import { StateLayer } from './StateLayer';
import { Tooltip } from './Tooltip';
import {
  DEFAULT_CATEGORY_COLORS,
  FALLBACK_PALETTE,
} from '../constants';
import { normalizeKey } from '../data/normalize';
import { featureCentroids } from '../geo/centroids';
import { fitProjection } from '../geo/projection';
import { useDrillDown } from '../hooks/useDrillDown';
import { useGeoJson } from '../hooks/useGeoJson';
import { useResolvedFeatureProps } from '../hooks/useResolvedFeatureProps';
import type {
  DistrictRow,
  GeoFeatureCollection,
  StateAggregate,
  StateDistrictPiesProps,
} from '../types';
import type { FeatureCentroid } from '../geo/centroids';

/**
 * Layout shell for the state choropleth + district pie overlay.
 *
 * Responsibilities are intentionally narrow:
 *   - Fetch the two GeoJSON files via `useGeoJson`.
 *   - Resolve join properties + dissolved outlines via
 *     `useResolvedFeatureProps`.
 *   - Track the drill level via `useDrillDown`.
 *   - Compose the children for the current level.
 *
 * Anything more domain-specific (key normalisation, segment grouping)
 * lives outside this file.
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
    ruralCategories,
    urbanCategories,
  } = props;

  const stateGeo = useGeoJson(stateGeoJsonUrl);
  const districtGeo = useGeoJson(districtGeoJsonUrl);
  const districtBaseGeo = districtGeo.data ?? stateGeo.data;

  const resolved = useResolvedFeatureProps({
    stateGeo: stateGeo.data,
    districtGeo: districtGeo.data,
    stateFeatureKeyProp,
    districtFeatureKeyProp,
    stateTotals,
    districts,
  });

  const drill = useDrillDown();

  const filteredGeo = useMemo((): GeoFeatureCollection | undefined => {
    if (!stateGeo.data) return undefined;
    if (drill.level === 'india') return stateGeo.data;

    if (!districtBaseGeo) return undefined;
    const allFeatures = districtBaseGeo.features;

    if (drill.level === 'state' && drill.selectedState) {
      return {
        type: 'FeatureCollection',
        features: allFeatures.filter(
          f =>
            normalizeKey(String(f.properties?.[resolved.stateFeatureKeyProp] ?? '')) ===
            normalizeKey(drill.selectedState!),
        ),
      };
    }
    if (
      (drill.level === 'district' || drill.level === 'detail') &&
      drill.selectedDistrict
    ) {
      return {
        type: 'FeatureCollection',
        features: allFeatures.filter(
          f =>
            normalizeKey(String(f.properties?.[resolved.districtFeatureKeyProp] ?? '')) ===
            normalizeKey(drill.selectedDistrict!),
        ),
      };
    }
    return districtBaseGeo;
  }, [
    stateGeo.data,
    drill.level,
    drill.selectedState,
    drill.selectedDistrict,
    districtBaseGeo,
    resolved.stateFeatureKeyProp,
    resolved.districtFeatureKeyProp,
  ]);

  const layerKeyProp =
    drill.level === 'india'
      ? resolved.stateFeatureKeyProp
      : resolved.districtFeatureKeyProp;

  const layerTotals: StateAggregate[] = useMemo(() => {
    if (drill.level === 'india') return resolved.stateTotals;
    const relevant = drill.selectedState
      ? districts.filter(
          d => normalizeKey(d.stateKey) === normalizeKey(drill.selectedState!),
        )
      : districts;
    return relevant.map(d => ({
      stateKey: d.districtKey,
      totalWeight: d.totalWeight,
    }));
  }, [drill.level, drill.selectedState, resolved.stateTotals, districts]);

  const colorFor = useMemo(
    () => buildColorAccessor(districts, colorScheme),
    [districts, colorScheme],
  );

  const geometry = useMemo(() => {
    if (!filteredGeo) return undefined;
    return fitProjection(filteredGeo, width, height);
  }, [filteredGeo, width, height]);

  const districtCentroids = useMemo(() => {
    if (drill.level === 'india') return [];
    if (!geometry || !filteredGeo) return [];
    return featureCentroids(
      filteredGeo,
      geometry.path,
      resolved.districtFeatureKeyProp,
    );
  }, [drill.level, geometry, filteredGeo, resolved.districtFeatureKeyProp]);

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

  const selectedDistrictRow = useMemo(() => {
    if (
      (drill.level !== 'district' && drill.level !== 'detail') ||
      !drill.selectedDistrict
    ) {
      return null;
    }
    return (
      districts.find(
        d => normalizeKey(d.districtKey) === normalizeKey(drill.selectedDistrict!),
      ) ?? null
    );
  }, [drill.level, drill.selectedDistrict, districts]);

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
        message={
          (stateGeo.error ?? districtGeo.error)?.message ?? 'GeoJSON fetch failed'
        }
      />
    );
  }

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

  if (drill.level === 'detail' && selectedDistrictRow) {
    return (
      <div
        className="sdp-root"
        style={{ position: 'relative', width, height, color: '#222' }}
      >
        <Breadcrumb segments={drill.breadcrumbs} />
        <DistrictDetailView
          row={selectedDistrictRow}
          width={width}
          height={height}
          colorFor={colorFor}
          ruralCategories={ruralCategories}
          urbanCategories={urbanCategories}
          onBack={drill.goToDistrict}
        />
      </div>
    );
  }

  const categories = uniqueCategories(districts);
  const showPies = drill.level !== 'india';

  return (
    <div
      className="sdp-root"
      style={{ position: 'relative', width, height, color: '#222' }}
    >
      <Breadcrumb segments={drill.breadcrumbs} />

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
          onFeatureClick={
            drill.level !== 'district' ? drill.onFeatureClick : undefined
          }
          strokeMode={drill.level === 'india' ? 'state-outline' : 'default'}
          stateOutlineGeo={
            drill.level === 'india' ? resolved.dissolvedStateGeo : undefined
          }
        />
        {showPies && (
          <g className="sdp-district-layer">
            {districtCentroids.map((centroid: FeatureCentroid) => {
              const row = districtsByKey.get(normalizeKey(centroid.key));
              if (!row) return null;
              const isSelected =
                drill.level === 'district' &&
                drill.selectedDistrict !== null &&
                normalizeKey(row.districtKey) === normalizeKey(drill.selectedDistrict);
              return (
                <DistrictPie
                  key={centroid.key}
                  row={row}
                  cx={centroid.cx}
                  cy={centroid.cy}
                  radius={radiusScale(row.totalWeight) * 0.78}
                  colorFor={colorFor}
                  onClick={drill.onPieClick}
                  onHover={showTooltip ? handleHover : undefined}
                  isSelected={isSelected}
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
