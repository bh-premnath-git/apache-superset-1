import React, { memo } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateGreens, interpolateGreys } from 'd3-scale-chromatic';
import type { GeoPath } from 'd3-geo';

import { normalizeKey } from '../data/normalize';
import type { GeoFeatureCollection, StateAggregate } from '../types';

export interface StateLayerProps {
  geo: GeoFeatureCollection;
  path: GeoPath;
  stateFeatureKeyProp: string;
  stateTotals: StateAggregate[];
  onFeatureClick?: (featureKey: string) => void;
  /** 'default' shows strokes between every feature; 'state-outline' hides
   *  internal district strokes and draws only state outlines. */
  strokeMode?: 'default' | 'state-outline';
  /** Dissolved state geometries (MultiPolygon per state) – rendered as
   *  outlines when strokeMode is 'state-outline'. */
  stateOutlineGeo?: GeoFeatureCollection;
  /**
   * When true, use a neutral greyscale instead of the green sequential
   * scale. Used when the active legend palette includes a hue close to
   * green to avoid colour collision with the donut wedges drawn on top.
   */
  useGreyScale?: boolean;
  /**
   * When true, the choropleth fill is drawn at reduced opacity so the
   * donut layer above reads cleanly. Used at the India zoom level.
   */
  muted?: boolean;
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
  strokeMode = 'default',
  stateOutlineGeo,
  useGreyScale = false,
  muted = false,
}: StateLayerProps) {
  const totalsByKey = new Map(stateTotals.map(s => [normalizeKey(s.stateKey), s.totalWeight]));
  const max = stateTotals.reduce((m, s) => Math.max(m, s.totalWeight), 0);
  // Clamp the top of the interpolator so the deepest greens never scream
  // over the donut layer. Bottom shift keeps data-states visible from zero.
  const interpolator = useGreyScale ? interpolateGreys : interpolateGreens;
  const color = scaleSequential(
    (t: number) => interpolator(0.15 + t * 0.40),
  ).domain([-(max || 1) * 0.25, max || 1]);
  const fillOpacity = muted ? 0.7 : 1;

  // In state-outline mode (India level), render only the dissolved state
  // MultiPolygons instead of the 594 individual district features. This
  // completely eliminates internal district boundary artifacts.
  const renderFeatures = strokeMode === 'state-outline' && stateOutlineGeo
    ? stateOutlineGeo.features
    : geo.features;

  return (
    <g className="sdp-state-layer" aria-label="State boundaries">
      {renderFeatures.map((feature, i) => {
        const rawKey = feature.properties?.[stateFeatureKeyProp];
        const lookupKey = rawKey == null ? '' : String(rawKey);
        const weight = totalsByKey.get(normalizeKey(lookupKey)) ?? 0;
        const d = path(feature as unknown as GeoJSON.Feature) ?? '';
        return (
          <path
            key={`f-${i}`}
            d={d}
            fill={weight > 0 ? color(weight) : '#e8e8e8'}
            fillOpacity={fillOpacity}
            stroke={strokeMode === 'state-outline' ? '#555' : '#999999'}
            strokeWidth={strokeMode === 'state-outline' ? 1.2 : 0.3}
            style={{
              ...(onFeatureClick ? { cursor: 'pointer' } : undefined),
              // paint-order: stroke first, then fill on top. This covers
              // internal district boundary strokes with fill, leaving only
              // external state boundary strokes visible.
              ...(strokeMode === 'state-outline'
                ? { paintOrder: 'stroke fill' }
                : undefined),
            }}
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
