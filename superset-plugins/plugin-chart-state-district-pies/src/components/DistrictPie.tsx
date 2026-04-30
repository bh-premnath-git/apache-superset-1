import React, { memo } from 'react';
import { arc as d3arc, pie as d3pie } from 'd3-shape';

import type { DistrictRow, Wedge } from '../types';

export interface DistrictPieProps {
  row: DistrictRow;
  cx: number;
  cy: number;
  radius: number;
  colorFor: (category: string) => string;
  onClick?: (row: DistrictRow) => void;
  onHover?: (row: DistrictRow | null, x: number, y: number) => void;
  /** True when this district is currently selected for detail view */
  isSelected?: boolean;
  /**
   * Inner radius for donut rendering. 0 (default) draws a solid pie.
   * When > 0 and `centerLabel`/`centerSubLabel` are provided, those are
   * rendered inside the hole.
   */
  innerRadius?: number;
  /** Primary text drawn inside the donut hole (e.g. district name). */
  centerLabel?: string;
  /** Secondary text drawn below `centerLabel` (e.g. formatted total). */
  centerSubLabel?: string;
  /** Stroke width on the outer edge of the donut/pie. Default 0.25. */
  outerStrokeWidth?: number;
  /** Drop shadow filter ID applied via filter="url(#id)". */
  shadowFilterId?: string;
}

/**
 * Renders one district's pie at its geographic centroid.
 *
 * A small white stroke around each wedge keeps neighbouring pies readable
 * when centroids cluster (e.g. Kerala, West Bengal).
 */
function DistrictPieImpl({
  row,
  cx,
  cy,
  radius,
  colorFor,
  onClick,
  onHover,
  isSelected,
  innerRadius = 0,
  centerLabel,
  centerSubLabel,
  outerStrokeWidth = 0.25,
  shadowFilterId,
}: DistrictPieProps) {
  const slices = d3pie<Wedge>().value(w => w.value).sort(null)(row.wedges);
  const arcFn = d3arc<typeof slices[number]>()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  // Scale center text relative to the donut hole so it never overflows.
  const labelFontSize = Math.max(10, Math.min(innerRadius * 0.42, 22));
  const subLabelFontSize = Math.max(9, Math.min(innerRadius * 0.28, 14));
  const showCenter = innerRadius > 0 && (centerLabel || centerSubLabel);

  return (
    <g
      className={`sdp-district-pie${isSelected ? ' selected' : ''}`}
      transform={`translate(${cx},${cy})`}
      role="button"
      tabIndex={0}
      aria-label={`District ${row.districtKey} in ${row.stateKey}`}
      aria-pressed={isSelected}
      onClick={onClick ? () => onClick(row) : undefined}
      onMouseEnter={onHover ? () => onHover(row, cx, cy) : undefined}
      onMouseLeave={onHover ? () => onHover(null, cx, cy) : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      filter={shadowFilterId ? `url(#${shadowFilterId})` : undefined}
    >
      {/* Selection highlight ring */}
      {isSelected && (
        <circle
          r={radius + 3}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
        />
      )}
      {/* Soft halo behind the wedges. Skipped when the donut hole is
          transparent (no center label) so the underlying map shows
          cleanly through the ring. */}
      {(innerRadius === 0 || showCenter) && (
        <circle
          r={radius + 0.75}
          fill="rgba(255,255,255,0.55)"
          stroke={isSelected ? 'rgba(37,99,235,0.3)' : 'rgba(0,0,0,0.10)'}
          strokeWidth={isSelected ? 1.5 : 0.35}
        />
      )}
      {slices.map(slice => (
        <path
          key={slice.data.category}
          d={arcFn(slice) ?? ''}
          fill={colorFor(slice.data.category)}
          fillOpacity={0.85}
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={outerStrokeWidth}
        />
      ))}
      {/* Donut-hole fill is only drawn when there's a center label —
          otherwise the hole stays transparent so the underlying map
          reads through the ring. */}
      {innerRadius > 0 && showCenter && (
        <circle
          r={innerRadius - 0.5}
          fill="#ffffff"
          fillOpacity={0.92}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={0.5}
        />
      )}
      {showCenter && (
        <g
          className="sdp-pie-center"
          textAnchor="middle"
          style={{ pointerEvents: 'none' }}
        >
          {centerLabel && (
            <text
              y={centerSubLabel ? -2 : labelFontSize / 3}
              fontSize={labelFontSize}
              fontWeight={600}
              fill="#222"
            >
              {centerLabel}
            </text>
          )}
          {centerSubLabel && (
            <text
              y={centerLabel ? labelFontSize - 2 : subLabelFontSize / 3}
              fontSize={subLabelFontSize}
              fill="#666"
            >
              {centerSubLabel}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

export const DistrictPie = memo(DistrictPieImpl);
