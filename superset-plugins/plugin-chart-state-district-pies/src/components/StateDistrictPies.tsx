import React, { useCallback, useMemo, useState } from 'react';
import { scaleSqrt } from 'd3-scale';
import { CategoricalColorNamespace } from '@superset-ui/core';

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
import type { DistrictRow, StateDistrictPiesProps } from '../types';

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

  const colorFor = useMemo(
    () => buildColorAccessor(districts, colorScheme),
    [districts, colorScheme],
  );

  const geometry = useMemo(() => {
    if (!stateGeo.data) return undefined;
    // Fit the projection to the state layer so the district overlay
    // inherits the exact same coordinate frame.
    return fitProjection(stateGeo.data, width, height);
  }, [stateGeo.data, width, height]);

  const districtCentroids = useMemo(() => {
    if (!geometry || !districtGeo.data) return [];
    return featureCentroids(districtGeo.data, geometry.path, districtFeatureKeyProp);
  }, [geometry, districtGeo.data, districtFeatureKeyProp]);

  const radiusScale = useMemo(() => {
    const maxWeight = districts.reduce((m, r) => Math.max(m, r.totalWeight), 0);
    return scaleSqrt()
      .domain([0, maxWeight || 1])
      .range([minPieRadius, maxPieRadius]);
  }, [districts, minPieRadius, maxPieRadius]);

  const districtsByKey = useMemo(() => {
    const map = new Map<string, DistrictRow>();
    for (const d of districts) map.set(d.districtKey, d);
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

  if (stateGeo.loading || districtGeo.loading || !stateGeo.data || !geometry) {
    return <StatusPanel width={width} height={height} message="Loading map…" />;
  }

  const categories = uniqueCategories(districts);

  return (
    <div
      className="sdp-root"
      style={{ position: 'relative', width, height, color: '#222' }}
    >
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="India state and district map"
      >
        <StateLayer
          geo={stateGeo.data}
          path={geometry.path}
          stateFeatureKeyProp={stateFeatureKeyProp}
          stateTotals={stateTotals}
        />
        <g className="sdp-district-layer">
          {districtCentroids.map(centroid => {
            const row = districtsByKey.get(centroid.key);
            if (!row) return null;
            return (
              <DistrictPie
                key={centroid.key}
                row={row}
                cx={centroid.cx}
                cy={centroid.cy}
                radius={radiusScale(row.totalWeight)}
                colorFor={colorFor}
                onClick={onDistrictClick}
                onHover={showTooltip ? handleHover : undefined}
              />
            );
          })}
        </g>
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
