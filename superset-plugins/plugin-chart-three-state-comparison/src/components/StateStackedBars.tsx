import React, { useMemo } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';

import type { StateStack } from '../types';
import { PercentLabel } from './PercentLabel';

interface StateStackedBarsProps {
  width: number;
  height: number;
  stateStacks: StateStack[];
  showPercentages: boolean;
  percentDecimals: number;
  labelThreshold: number;
  onSegmentClick?: (segment: string) => void;
}

/** Stacked bar chart — one bar per state, segments stacked 0-100%. */
export const StateStackedBars: React.FC<StateStackedBarsProps> = ({
  width,
  height,
  stateStacks,
  showPercentages,
  percentDecimals,
  labelThreshold,
  onSegmentClick,
}) => {
  const margin = { top: 12, right: 16, bottom: 48, left: 46 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(stateStacks.map(s => s.state))
        .range([0, innerWidth])
        .padding(0.3),
    [stateStacks, innerWidth],
  );

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 100])
        .range([innerHeight, 0]),
    [innerHeight],
  );

  const barWidth = xScale.bandwidth();

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Y-axis gridlines + labels */}
        {[0, 25, 50, 75, 100].map(tick => (
          <g key={tick} transform={`translate(0,${yScale(tick)})`}>
            <line x2={innerWidth} stroke="#e5e7eb" strokeDasharray="2,2" />
            <text
              x={-8}
              dy="0.32em"
              textAnchor="end"
              fontSize={11}
              fill="#6b7280"
            >
              {tick}%
            </text>
          </g>
        ))}

        {/* Bars */}
        {stateStacks.map(ss => {
          const x = xScale(ss.state) ?? 0;

          return (
            <g key={ss.state}>
              {ss.segments.map(seg => {
                const y = yScale(seg.y1);
                const h = yScale(seg.y0) - yScale(seg.y1);
                const show = showPercentages && seg.percentage >= labelThreshold && h > 16;
                const isDark = ['R4', 'U3'].includes(seg.segment);

                return (
                  <g key={`${ss.state}-${seg.segment}`}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(h, 0)}
                      fill={seg.color}
                      stroke="#fff"
                      strokeWidth={1}
                      cursor={onSegmentClick ? 'pointer' : 'default'}
                      onClick={() => onSegmentClick?.(seg.segment)}
                    />
                    {show && (
                      <PercentLabel
                        x={x + barWidth / 2}
                        y={y + h / 2}
                        percentage={seg.percentage}
                        decimals={percentDecimals}
                        color={isDark ? '#fff' : '#333'}
                        fontSize={seg.percentage > 20 ? 12 : 10}
                      />
                    )}
                  </g>
                );
              })}

              {/* X-axis label (state name) */}
              <text
                x={x + barWidth / 2}
                y={innerHeight + 20}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                fill="#374151"
              >
                {ss.state}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
