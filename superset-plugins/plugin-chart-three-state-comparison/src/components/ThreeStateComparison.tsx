import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { ThreeStateComparisonProps } from '../types';
import { AggregatePie } from './AggregatePie';
import { StateStackedBars } from './StateStackedBars';
import { ChartLegend } from './ChartLegend';
import { Tooltip, type TooltipDatum } from './Tooltip';

/**
 * Root orchestrator — lays out the aggregate pie (left) and per-state
 * stacked bars (right) with an optional legend strip. Manages tooltip
 * + cross-component hover state.
 */
const ThreeStateComparison: React.FC<ThreeStateComparisonProps> = ({
  width,
  height,
  aggregateWedges,
  aggregateTotal,
  stateStacks,
  segmentColors,
  segmentOrder,
  metricLabel,
  showLegend,
  showPercentages,
  legendPosition,
  percentDecimals,
  labelThreshold,
  onSegmentClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipDatum | null>(null);
  const [pieHoverSegment, setPieHoverSegment] = useState<string | null>(null);
  const [barHoverKey, setBarHoverKey] = useState<string | null>(null);
  const [legendHoverSegment, setLegendHoverSegment] = useState<string | null>(null);

  const legendHeight = showLegend && legendPosition === 'bottom' ? 44 : 0;
  const legendWidth = showLegend && legendPosition === 'right' ? 132 : 0;
  const chartWidth = Math.max(0, width - legendWidth);
  const chartHeight = Math.max(0, height - legendHeight);

  const pieWidth = Math.floor(chartWidth * 0.4);
  const barWidth = chartWidth - pieWidth;

  const activeSegments = useMemo(
    () => segmentOrder.filter(s => segmentColors[s]),
    [segmentOrder, segmentColors],
  );

  const updateTooltipPosition = useCallback(
    (datum: TooltipDatum, e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return datum;
      return { ...datum, x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [],
  );

  const handlePieHover = useCallback(
    (data: TooltipDatum | null, e?: React.MouseEvent) => {
      if (!data) {
        setTooltip(null);
        setPieHoverSegment(null);
        return;
      }
      setPieHoverSegment(data.segment);
      if (e) setTooltip(updateTooltipPosition(data, e));
    },
    [updateTooltipPosition],
  );

  const handleBarHover = useCallback(
    (data: TooltipDatum | null, e?: React.MouseEvent) => {
      if (!data) {
        setTooltip(null);
        setBarHoverKey(null);
        return;
      }
      setBarHoverKey(`${data.state}-${data.segment}`);
      if (e) setTooltip(updateTooltipPosition(data, e));
    },
    [updateTooltipPosition],
  );

  // When the user hovers the legend, dim non-matching pie wedges only
  // (do not synthesize a tooltip — there's no specific data row to show).
  const effectivePieHover = legendHoverSegment ?? pieHoverSegment;

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
          background:
            'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, rgba(241,245,249,0.6) 100%)',
          borderRadius: 8,
        }}
      >
        No data available. Check filters and dataset.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'relative',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        color: '#1f2937',
        display: 'flex',
        flexDirection: legendPosition === 'right' ? 'row' : 'column',
      }}
    >
      <div style={{ display: 'flex', width: chartWidth, height: chartHeight }}>
        {/* Left: Aggregate Donut */}
        <div style={{ width: pieWidth, height: chartHeight }}>
          <AggregatePie
            width={pieWidth}
            height={chartHeight}
            wedges={aggregateWedges}
            total={aggregateTotal}
            metricLabel={metricLabel}
            showPercentages={showPercentages}
            percentDecimals={percentDecimals}
            labelThreshold={labelThreshold}
            hoveredSegment={effectivePieHover}
            onSegmentClick={onSegmentClick}
            onHover={handlePieHover}
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
            hoveredKey={barHoverKey}
            onSegmentClick={onSegmentClick}
            onHover={handleBarHover}
          />
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <ChartLegend
          segments={activeSegments}
          colors={segmentColors}
          position={legendPosition}
          hoveredSegment={legendHoverSegment}
          onHoverSegment={setLegendHoverSegment}
        />
      )}

      <Tooltip
        data={tooltip}
        containerWidth={width}
        containerHeight={height}
        decimals={percentDecimals}
        metricLabel={metricLabel}
      />
    </div>
  );
};

export default ThreeStateComparison;
