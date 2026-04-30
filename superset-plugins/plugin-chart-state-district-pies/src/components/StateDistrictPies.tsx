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
  DEFAULT_MAX_STATE_PIE_RADIUS,
  DEFAULT_MIN_STATE_PIE_RADIUS,
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
    metricsDatasourceId,
    metricsStateColumn,
    metricsDistrictColumn,
    metricsSegmentColumn,
    metricsDefinitions,
    segmentDescriptions,
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

  // Separate scale for India-level state donuts: states are larger and
  // fewer than districts, so they get a bigger radius range.
  const stateRadiusScale = useMemo(() => {
    const maxWeight = resolved.stateTotals.reduce(
      (m, s) => Math.max(m, s.totalWeight),
      0,
    );
    return scaleSqrt()
      .domain([0, maxWeight || 1])
      .range([DEFAULT_MIN_STATE_PIE_RADIUS, DEFAULT_MAX_STATE_PIE_RADIUS]);
  }, [resolved.stateTotals]);

  // Detect whether any active legend colour is close to the green choropleth
  // hue. When yes, fall back to a neutral grey base map so wedge colours
  // never compete with the underlying fill.
  const useGreyChoropleth = useMemo(
    () => paletteCollidesWithGreens(districts, colorFor),
    [districts, colorFor],
  );

  // India-level pies: synthesize a DistrictRow shape from each state's
  // wedges so the existing DistrictPie component renders them unchanged.
  const stateRows = useMemo<DistrictRow[]>(() => {
    if (drill.level !== 'india') return [];
    return resolved.stateTotals
      .filter(s => s.wedges && s.wedges.length > 0)
      .map(s => ({
        stateKey: s.stateKey,
        districtKey: s.stateKey,
        wedges: s.wedges as DistrictRow['wedges'],
        totalWeight: s.totalWeight,
      }));
  }, [drill.level, resolved.stateTotals]);

  const stateRowsByKey = useMemo(() => {
    const map = new Map<string, DistrictRow>();
    for (const r of stateRows) map.set(normalizeKey(r.stateKey), r);
    return map;
  }, [stateRows]);

  const stateCentroids = useMemo(() => {
    if (drill.level !== 'india') return [];
    if (!geometry || !filteredGeo) return [];
    return featureCentroids(
      filteredGeo,
      geometry.path,
      resolved.stateFeatureKeyProp,
    );
  }, [drill.level, geometry, filteredGeo, resolved.stateFeatureKeyProp]);

  // District-zoom donut sizing. When a single district fills the canvas we
  // ignore the shared radiusScale (tuned for many districts at once) and
  // size the hero pie from the available canvas instead.
  const districtZoomRadius = useMemo(() => {
    if (drill.level !== 'district') return 0;
    const r = Math.min(width, height) * 0.32;
    return Math.max(60, Math.min(r, Math.min(width, height) / 3));
  }, [drill.level, width, height]);

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
          metricsDatasourceId={metricsDatasourceId}
          metricsStateColumn={metricsStateColumn}
          metricsDistrictColumn={metricsDistrictColumn}
          metricsSegmentColumn={metricsSegmentColumn}
          metricsDefinitions={metricsDefinitions}
          segmentDescriptions={segmentDescriptions}
        />
      </div>
    );
  }

  const categories = uniqueCategories(districts);
  const isIndia = drill.level === 'india';
  const isDistrictZoom = drill.level === 'district';
  const showStatePies = isIndia && stateRows.length > 0;
  const showDistrictPies = !isIndia;
  const shadowFilterId = 'sdp-pie-shadow';

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
        <defs>
          {/* Subtle drop shadow lifts donuts off the choropleth/base map. */}
          <filter id={shadowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="1.2"
              floodColor="#000"
              floodOpacity="0.18"
            />
          </filter>
        </defs>
        <StateLayer
          geo={filteredGeo}
          path={geometry.path}
          stateFeatureKeyProp={layerKeyProp}
          stateTotals={layerTotals}
          onFeatureClick={
            drill.level !== 'district' ? drill.onFeatureClick : undefined
          }
          strokeMode={isIndia ? 'state-outline' : 'default'}
          stateOutlineGeo={isIndia ? resolved.dissolvedStateGeo : undefined}
          useGreyScale={isIndia && useGreyChoropleth}
        />
        {showStatePies && (
          <g className="sdp-state-pie-layer">
            {stateCentroids.map((centroid: FeatureCentroid) => {
              const row = stateRowsByKey.get(normalizeKey(centroid.key));
              if (!row) return null;
              const radius = stateRadiusScale(row.totalWeight);
              return (
                <DistrictPie
                  key={`state-${centroid.key}`}
                  row={row}
                  cx={centroid.cx}
                  cy={centroid.cy}
                  radius={radius}
                  innerRadius={radius * 0.55}
                  colorFor={colorFor}
                  onClick={() => drill.onFeatureClick(centroid.key)}
                  onHover={showTooltip ? handleHover : undefined}
                  outerStrokeWidth={0.75}
                />
              );
            })}
          </g>
        )}
        {showDistrictPies && (
          <g className="sdp-district-layer">
            {districtCentroids.map((centroid: FeatureCentroid) => {
              const row = districtsByKey.get(normalizeKey(centroid.key));
              if (!row) return null;
              const isSelected =
                isDistrictZoom &&
                drill.selectedDistrict !== null &&
                normalizeKey(row.districtKey) === normalizeKey(drill.selectedDistrict);
              const radius = isDistrictZoom
                ? districtZoomRadius
                : radiusScale(row.totalWeight) * 0.78;
              const innerRadius = isDistrictZoom ? radius * 0.55 : 0;
              return (
                <DistrictPie
                  key={centroid.key}
                  row={row}
                  cx={centroid.cx}
                  cy={centroid.cy}
                  radius={radius}
                  innerRadius={innerRadius}
                  centerLabel={isDistrictZoom ? row.districtKey : undefined}
                  centerSubLabel={
                    isDistrictZoom
                      ? formatTotal(row.totalWeight)
                      : undefined
                  }
                  colorFor={colorFor}
                  onClick={drill.onPieClick}
                  onHover={showTooltip ? handleHover : undefined}
                  isSelected={isSelected}
                  outerStrokeWidth={isDistrictZoom ? 1.5 : 0.25}
                  shadowFilterId={isDistrictZoom ? shadowFilterId : undefined}
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

/**
 * Heuristic: returns true when any active legend colour is "green-ish"
 * (G channel meaningfully larger than R and B). When this happens we
 * swap the choropleth interpolator from greens to greys so the wedge
 * fills always read clearly against the base map.
 */
function paletteCollidesWithGreens(
  rows: DistrictRow[],
  colorFor: (category: string) => string,
): boolean {
  const cats = uniqueCategories(rows);
  for (const cat of cats) {
    const rgb = parseHexColor(colorFor(cat));
    if (!rgb) continue;
    const { r, g, b } = rgb;
    if (g > r + 25 && g > b + 25 && g > 120) return true;
  }
  return false;
}

function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  if (!input) return null;
  const m = input.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function formatTotal(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
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
