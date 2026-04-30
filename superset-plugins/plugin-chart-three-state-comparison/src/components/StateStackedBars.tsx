import React, { useMemo, useRef } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';

import type { StateStack } from '../types';
import { PercentLabel } from './PercentLabel';
import type { TooltipDatum } from './Tooltip';

interface StateStackedBarsProps {
  width: number;
  height: number;
  stateStacks: StateStack[];
  showPercentages: boolean;
  percentDecimals: number;
  labelThreshold: number;
  hoveredKey: string | null;
  onSegmentClick?: (segment: string) => void;
  onHover: (data: TooltipDatum | null, event?: React.MouseEvent) => void;
}

const DARK_SEGMENTS = new Set(['R4', 'U3']);

/** Stacked bar chart — one bar per state, segments stacked 0-100%. */
export const StateStackedBars: React.FC<StateStackedBarsProps> = ({
  width,
  height,
  stateStacks,
  showPercentages,
  percentDecimals,
  labelThreshold,
  hoveredKey,
  onSegmentClick,
  onHover,
}) => {
  const idRef = useRef<string>(
    `bar-shadow-${Math.random().toString(36).slice(2, 10)}`,
  );
  const filterId = idRef.current;

  const margin = { top: 16, right: 20, bottom: 52, left: 50 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const xScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(stateStacks.map(s => s.state))
        .range([0, innerWidth])
        .padding(0.35),
    [stateStacks, innerWidth],
  );

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 100])
        .range([innerHeight, 0]),
    [innerHeight],
  );

  const barWidth = Math.min(xScale.bandwidth(), 88);

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
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Y-axis gridlines + labels */}
        {[0, 25, 50, 75, 100].map(tick => (
          <g key={tick} transform={`translate(0,${yScale(tick)})`}>
            <line
              x2={innerWidth}
              stroke="#e5e7eb"
              strokeDasharray={tick === 0 || tick === 100 ? undefined : '2,3'}
              strokeWidth={tick === 0 ? 1 : 1}
            />
            <text
              x={-10}
              dy="0.32em"
              textAnchor="end"
              fontSize={11}
              fill="#9ca3af"
              fontWeight={500}
            >
              {tick}%
            </text>
          </g>
        ))}

        {/* Bars */}
        {stateStacks.map(ss => {
          const bandX = xScale(ss.state) ?? 0;
          const x = bandX + (xScale.bandwidth() - barWidth) / 2;

          return (
            <g key={ss.state}>
              {ss.segments.map((seg, idx) => {
                const key = `${ss.state}-${seg.segment}`;
                const y = yScale(seg.y1);
                const h = yScale(seg.y0) - yScale(seg.y1);
                const show = showPercentages && seg.percentage >= labelThreshold && h > 16;
                const isDark = DARK_SEGMENTS.has(seg.segment);
                const isHovered = hoveredKey === key;
                const isDimmed = hoveredKey !== null && !isHovered;
                const isTop = idx === ss.segments.length - 1;
                const isBottom = idx === 0;
                // Round only the outer corners of the stack.
                const rx = isTop || isBottom ? 4 : 0;

                return (
                  <g key={key}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(h, 0)}
                      fill={seg.color}
                      stroke="#fff"
                      strokeWidth={1}
                      rx={rx}
                      ry={rx}
                      filter={isHovered ? `url(#${filterId})` : undefined}
                      opacity={isDimmed ? 0.55 : 1}
                      style={{ transition: 'opacity 120ms ease-out' }}
                      cursor={onSegmentClick ? 'pointer' : 'default'}
                      onClick={() => onSegmentClick?.(seg.segment)}
                      onMouseEnter={e =>
                        onHover(
                          {
                            segment: seg.segment,
                            color: seg.color,
                            value: seg.value,
                            percentage: seg.percentage,
                            state: ss.state,
                            x: 0,
                            y: 0,
                          },
                          e,
                        )
                      }
                      onMouseMove={e =>
                        onHover(
                          {
                            segment: seg.segment,
                            color: seg.color,
                            value: seg.value,
                            percentage: seg.percentage,
                            state: ss.state,
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
                        x={x + barWidth / 2}
                        y={y + h / 2}
                        percentage={seg.percentage}
                        decimals={percentDecimals}
                        color={isDark ? '#fff' : '#1f2937'}
                        fontSize={seg.percentage > 20 ? 12 : 10}
                      />
                    )}
                  </g>
                );
              })}

              {/* X-axis label (state name) */}
              <text
                x={bandX + xScale.bandwidth() / 2}
                y={innerHeight + 22}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="#374151"
              >
                {ss.state}
              </text>
              {/* Total below the state name */}
              <text
                x={bandX + xScale.bandwidth() / 2}
                y={innerHeight + 38}
                textAnchor="middle"
                fontSize={11}
                fill="#9ca3af"
                fontWeight={500}
              >
                {ss.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
