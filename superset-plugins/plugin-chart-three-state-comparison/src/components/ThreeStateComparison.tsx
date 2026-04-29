import React, { useMemo } from 'react';

import type { ThreeStateComparisonProps } from '../types';
import { AggregatePie } from './AggregatePie';
import { StateStackedBars } from './StateStackedBars';
import { ChartLegend } from './ChartLegend';

/**
 * Root orchestrator — lays out the aggregate pie (left) and per-state
 * stacked bars (right) with an optional legend strip.
 */
const ThreeStateComparison: React.FC<ThreeStateComparisonProps> = ({
  width,
  height,
  aggregateWedges,
  stateStacks,
  segmentColors,
  segmentOrder,
  showLegend,
  showPercentages,
  legendPosition,
  percentDecimals,
  labelThreshold,
  onSegmentClick,
}) => {
  const legendHeight = showLegend && legendPosition === 'bottom' ? 44 : 0;
  const legendWidth = showLegend && legendPosition === 'right' ? 120 : 0;
  const chartWidth = width - legendWidth;
  const chartHeight = height - legendHeight;

  const pieWidth = Math.floor(chartWidth * 0.38);
  const barWidth = chartWidth - pieWidth;

  // Only show legend for segments that actually appear in the data
  const activeSegments = useMemo(
    () => segmentOrder.filter(s => segmentColors[s]),
    [segmentOrder, segmentColors],
  );

  if (aggregateWedges.length === 0 && stateStacks.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: 14,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        No data available. Check filters and dataset.
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: legendPosition === 'right' ? 'row' : 'column',
      }}
    >
      <div style={{ display: 'flex', width: chartWidth, height: chartHeight }}>
        {/* Left: Aggregate Pie */}
        <div style={{ width: pieWidth, height: chartHeight }}>
          <AggregatePie
            width={pieWidth}
            height={chartHeight}
            wedges={aggregateWedges}
            showPercentages={showPercentages}
            percentDecimals={percentDecimals}
            labelThreshold={labelThreshold}
            onSegmentClick={onSegmentClick}
          />
        </div>

        {/* Right: Stacked Bars */}
        <div style={{ width: barWidth, height: chartHeight }}>
          <StateStackedBars
            width={barWidth}
            height={chartHeight}
            stateStacks={stateStacks}
            showPercentages={showPercentages}
            percentDecimals={percentDecimals}
            labelThreshold={labelThreshold}
            onSegmentClick={onSegmentClick}
          />
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <ChartLegend
          segments={activeSegments}
          colors={segmentColors}
          position={legendPosition}
        />
      )}
    </div>
  );
};

export default ThreeStateComparison;
