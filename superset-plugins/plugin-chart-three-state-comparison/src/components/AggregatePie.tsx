import React, { useMemo } from 'react';
import { pie as d3Pie, arc as d3Arc } from 'd3-shape';
import type { PieArcDatum } from 'd3-shape';

import type { Wedge } from '../types';
import { PercentLabel } from './PercentLabel';

interface AggregatePieProps {
  width: number;
  height: number;
  wedges: Wedge[];
  showPercentages: boolean;
  percentDecimals: number;
  labelThreshold: number;
  onSegmentClick?: (segment: string) => void;
}

/** Aggregate pie chart showing combined segment distribution. */
export const AggregatePie: React.FC<AggregatePieProps> = ({
  width,
  height,
  wedges,
  showPercentages,
  percentDecimals,
  labelThreshold,
  onSegmentClick,
}) => {
  const radius = Math.min(width, height) / 2 - 16;
  const cx = width / 2;
  const cy = height / 2;

  const pieGen = useMemo(
    () =>
      d3Pie<Wedge>()
        .value(d => d.value)
        .sort(null),
    [],
  );

  const arcGen = useMemo(
    () =>
      d3Arc<PieArcDatum<Wedge>>()
        .innerRadius(0)
        .outerRadius(radius),
    [radius],
  );

  const labelArc = useMemo(
    () =>
      d3Arc<PieArcDatum<Wedge>>()
        .innerRadius(radius * 0.6)
        .outerRadius(radius * 0.6),
    [radius],
  );

  const arcs = pieGen(wedges);

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${cx},${cy})`}>
        {arcs.map(a => {
          const d = arcGen(a);
          if (!d) return null;

          const centroid = labelArc.centroid(a);
          const show = showPercentages && a.data.percentage >= labelThreshold;

          // Determine label color based on segment darkness
          const isDark = ['R4', 'U3'].includes(a.data.segment);

          return (
            <g key={a.data.segment}>
              <path
                d={d}
                fill={a.data.color}
                stroke="#fff"
                strokeWidth={1.5}
                cursor={onSegmentClick ? 'pointer' : 'default'}
                onClick={() => onSegmentClick?.(a.data.segment)}
              />
              {show && (
                <PercentLabel
                  x={centroid[0]}
                  y={centroid[1]}
                  percentage={a.data.percentage}
                  decimals={percentDecimals}
                  color={isDark ? '#fff' : '#333'}
                  fontSize={a.data.percentage > 15 ? 14 : 12}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
