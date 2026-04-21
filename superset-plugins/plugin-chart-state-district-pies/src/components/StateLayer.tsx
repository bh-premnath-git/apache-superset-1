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
}: StateLayerProps) {
  const totalsByKey = new Map(stateTotals.map(s => [s.stateKey, s.totalWeight]));
  const max = stateTotals.reduce((m, s) => Math.max(m, s.totalWeight), 0);
  const color = scaleSequential(interpolateBlues).domain([0, max || 1]);

  return (
    <g className="sdp-state-layer" aria-label="State boundaries">
      {geo.features.map((feature, i) => {
        const rawKey = feature.properties?.[stateFeatureKeyProp];
        const key = rawKey == null ? `s-${i}` : String(rawKey);
        const weight = totalsByKey.get(key) ?? 0;
        const d = path(feature as unknown as GeoJSON.Feature) ?? '';
        return (
          <path
            key={key}
            d={d}
            fill={weight > 0 ? color(weight) : '#f2f2f2'}
            stroke="#ffffff"
            strokeWidth={0.5}
            aria-label={key}
          >
            <title>{`${key}: ${weight.toLocaleString()}`}</title>
          </path>
        );
      })}
    </g>
  );
}

export const StateLayer = memo(StateLayerImpl);
