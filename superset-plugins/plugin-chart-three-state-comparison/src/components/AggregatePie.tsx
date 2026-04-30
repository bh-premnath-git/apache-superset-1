import React, { useMemo, useRef } from 'react';
import { pie as d3Pie, arc as d3Arc } from 'd3-shape';
import type { PieArcDatum } from 'd3-shape';

import type { Wedge } from '../types';
import { PercentLabel } from './PercentLabel';
import type { TooltipDatum } from './Tooltip';

interface AggregatePieProps {
  width: number;
  height: number;
  wedges: Wedge[];
  total: number;
  metricLabel?: string;
  showPercentages: boolean;
  percentDecimals: number;
  labelThreshold: number;
  hoveredSegment: string | null;
  onSegmentClick?: (segment: string) => void;
  onHover: (data: TooltipDatum | null, event?: React.MouseEvent) => void;
}

const DARK_SEGMENTS = new Set(['R4', 'U3']);

/** Aggregate donut chart showing combined segment distribution. */
export const AggregatePie: React.FC<AggregatePieProps> = ({
  width,
  height,
  wedges,
  total,
  metricLabel,
  showPercentages,
  percentDecimals,
  labelThreshold,
  hoveredSegment,
  onSegmentClick,
  onHover,
}) => {
  const idRef = useRef<string>(
    `pie-shadow-${Math.random().toString(36).slice(2, 10)}`,
  );
  const filterId = idRef.current;

  const radius = Math.min(width, height) / 2 - 18;
  const innerRadius = radius * 0.55;
  const cx = width / 2;
  const cy = height / 2;

  const pieGen = useMemo(
    () =>
      d3Pie<Wedge>()
        .value(d => d.value)
        .padAngle(0.012)
        .sort(null),
    [],
  );

  const arcGen = useMemo(
    () =>
      d3Arc<PieArcDatum<Wedge>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(3),
    [innerRadius, radius],
  );

  const hoverArcGen = useMemo(
    () =>
      d3Arc<PieArcDatum<Wedge>>()
        .innerRadius(innerRadius)
        .outerRadius(radius + 6)
        .cornerRadius(3),
    [innerRadius, radius],
  );

  const labelArc = useMemo(
    () =>
      d3Arc<PieArcDatum<Wedge>>()
        .innerRadius((radius + innerRadius) / 2)
        .outerRadius((radius + innerRadius) / 2),
    [radius, innerRadius],
  );

  const arcs = pieGen(wedges);
  const formattedTotal = Number.isFinite(total)
    ? total.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '—';

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="3"
            floodColor="#0f172a"
            floodOpacity="0.18"
          />
        </filter>
      </defs>
      <g transform={`translate(${cx},${cy})`}>
        {arcs.map(a => {
          const isHovered = hoveredSegment === a.data.segment;
          const isDimmed = hoveredSegment !== null && !isHovered;
          const d = (isHovered ? hoverArcGen : arcGen)(a);
          if (!d) return null;

          const centroid = labelArc.centroid(a);
          const show = showPercentages && a.data.percentage >= labelThreshold;
          const isDark = DARK_SEGMENTS.has(a.data.segment);

          return (
            <g key={a.data.segment}>
              <path
                d={d}
                fill={a.data.color}
                stroke="#fff"
                strokeWidth={1.5}
                filter={isHovered ? `url(#${filterId})` : undefined}
                opacity={isDimmed ? 0.55 : 1}
                style={{ transition: 'opacity 120ms ease-out, d 120ms ease-out' }}
                cursor={onSegmentClick ? 'pointer' : 'default'}
                onClick={() => onSegmentClick?.(a.data.segment)}
                onMouseEnter={e =>
                  onHover(
                    {
                      segment: a.data.segment,
                      color: a.data.color,
                      value: a.data.value,
                      percentage: a.data.percentage,
                      x: 0,
                      y: 0,
                    },
                    e,
                  )
                }
                onMouseMove={e =>
                  onHover(
                    {
                      segment: a.data.segment,
                      color: a.data.color,
                      value: a.data.value,
                      percentage: a.data.percentage,
                      x: 0,
                      y: 0,
                    },
                    e,
                  )
                }
                onMouseLeave={() => onHover(null)}
              />
              {show && (
                <PercentLabel
                  x={centroid[0]}
                  y={centroid[1]}
                  percentage={a.data.percentage}
                  decimals={percentDecimals}
                  color={isDark ? '#fff' : '#1f2937'}
                  fontSize={a.data.percentage > 15 ? 14 : 11}
                />
              )}
            </g>
          );
        })}

        {/* Donut center: total */}
        {total > 0 && (
          <g style={{ pointerEvents: 'none' }}>
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={-6}
              fontSize={11}
              fill="#6b7280"
              style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}
            >
              {metricLabel || 'Total'}
            </text>
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={12}
              fontSize={Math.min(18, innerRadius * 0.45)}
              fontWeight={700}
              fill="#111827"
            >
              {formattedTotal}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
};
