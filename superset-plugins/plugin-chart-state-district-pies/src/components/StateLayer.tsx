import React, { memo } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import type { GeoPath } from 'd3-geo';

import type { GeoFeatureCollection, StateAggregate } from '../types';

export interface StateLayerProps {
  geo: GeoFeatureCollection;
  path: GeoPath;
  stateFeatureKeyProp: string;
  stateTotals: StateAggregate[];
  onFeatureClick?: (featureKey: string) => void;
}

/**
 * Base choropleth layer. Colors each state by its summed district weight so
 * the map conveys density even before the district pies are read. The layer
 * is isolated from the pie overlay so React can bail out of re-rendering it
 * when only hover state on the overlay changes.
 */
function StateLayerImpl({
  geo,
  path,
  stateFeatureKeyProp,
  stateTotals,
  onFeatureClick,
}: StateLayerProps) {
  const totalsByKey = new Map(stateTotals.map(s => [s.stateKey.toLowerCase().trim(), s.totalWeight]));
  const max = stateTotals.reduce((m, s) => Math.max(m, s.totalWeight), 0);
  // Shift domain so data-states start at a clearly visible blue, not near-white.
  const color = scaleSequential(interpolateBlues).domain([-(max || 1) * 0.25, max || 1]);

  return (
    <g className="sdp-state-layer" aria-label="State boundaries">
      {geo.features.map((feature, i) => {
        const rawKey = feature.properties?.[stateFeatureKeyProp];
        const lookupKey = rawKey == null ? '' : String(rawKey);
        const weight = totalsByKey.get(lookupKey.toLowerCase().trim()) ?? 0;
        const d = path(feature as unknown as GeoJSON.Feature) ?? '';
        return (
          <path
            key={`f-${i}`}
            d={d}
            fill={weight > 0 ? color(weight) : '#e8e8e8'}
            stroke="#999999"
            strokeWidth={0.3}
            style={onFeatureClick ? { cursor: 'pointer' } : undefined}
            onClick={onFeatureClick && lookupKey ? () => onFeatureClick(lookupKey) : undefined}
            aria-label={lookupKey || `s-${i}`}
          >
            <title>{`${lookupKey || `feature-${i}`}: ${weight.toLocaleString()}`}</title>
          </path>
        );
      })}
    </g>
  );
}

export const StateLayer = memo(StateLayerImpl);
