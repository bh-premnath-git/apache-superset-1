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
}: DistrictPieProps) {
  const slices = d3pie<Wedge>().value(w => w.value).sort(null)(row.wedges);
  const arcFn = d3arc<typeof slices[number]>()
    .innerRadius(0)
    .outerRadius(radius);

  return (
    <g
      className="sdp-district-pie"
      transform={`translate(${cx},${cy})`}
      role="button"
      tabIndex={0}
      aria-label={`District ${row.districtKey} in ${row.stateKey}`}
      onClick={onClick ? () => onClick(row) : undefined}
      onMouseEnter={onHover ? () => onHover(row, cx, cy) : undefined}
      onMouseLeave={onHover ? () => onHover(null, cx, cy) : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <circle
        r={radius + 0.75}
        fill="rgba(255,255,255,0.55)"
        stroke="rgba(0,0,0,0.10)"
        strokeWidth={0.35}
      />
      {slices.map(slice => (
        <path
          key={slice.data.category}
          d={arcFn(slice) ?? ''}
          fill={colorFor(slice.data.category)}
          fillOpacity={0.72}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={0.25}
        />
      ))}
    </g>
  );
}

export const DistrictPie = memo(DistrictPieImpl);
