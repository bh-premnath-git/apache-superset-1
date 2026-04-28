import React, { memo } from 'react';
import type { DistrictRow, Wedge } from '../types';

export interface DistrictDetailViewProps {
  row: DistrictRow;
  width: number;
  height: number;
  colorFor: (category: string) => string;
  onBack: () => void;
}

/**
 * Shows detailed rural (R1-R4) vs urban (U1-U3) comparison for a selected district.
 *
 * Layout: Stacked sections with header, rural bar chart, urban bar chart, and legend.
 */
function DistrictDetailViewImpl({
  row,
  width,
  height,
  colorFor,
  onBack,
}: DistrictDetailViewProps) {
  const rural = row.ruralWedges ?? [];
  const urban = row.urbanWedges ?? [];

  const ruralTotal = rural.reduce((s, w) => s + w.value, 0);
  const urbanTotal = urban.reduce((s, w) => s + w.value, 0);
  const grandTotal = ruralTotal + urbanTotal;

  // Layout calculations
  const padding = 16;
  const availableHeight = height - 40 - padding * 2;
  const availableWidth = width - padding * 2;

  // Bar dimensions
  const barHeight = Math.min(40, availableHeight / 3);
  const barWidth = Math.max(120, availableWidth - 80); // Fit within panel

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        padding,
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: 12,
        color: '#222',
        background: '#fff',
      }}
    >
      {/* Header with back button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          borderBottom: '1px solid #e2e4e8',
          paddingBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {row.districtKey}, {row.stateKey}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            Total: {formatNumber(grandTotal)} households
          </div>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '6px 14px',
            fontSize: 12,
            background: '#f5f6f8',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          ← Back
        </button>
      </div>

      {/* Rural Section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#1f8f5c' }}>
          Rural Segments ({formatNumber(ruralTotal)})
        </div>
        {rural.length > 0 ? (
          <svg width={barWidth + 70} height={barHeight + 20}>
            {renderStackedBar(rural, ruralTotal, 10, 0, barWidth, barHeight, colorFor)}
          </svg>
        ) : (
          <div style={{ color: '#999', fontStyle: 'italic' }}>No rural data</div>
        )}
      </div>

      {/* Urban Section */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#1565d8' }}>
          Urban Segments ({formatNumber(urbanTotal)})
        </div>
        {urban.length > 0 ? (
          <svg width={barWidth + 70} height={barHeight + 20}>
            {renderStackedBar(urban, urbanTotal, 10, 0, barWidth, barHeight, colorFor)}
          </svg>
        ) : (
          <div style={{ color: '#999', fontStyle: 'italic' }}>No urban data</div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: padding,
          left: padding,
          right: padding,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          fontSize: 11,
        }}
      >
        {[...rural, ...urban].map(w => (
          <span key={w.category} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: colorFor(w.category),
                borderRadius: 2,
              }}
            />
            <span>{w.category}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function renderStackedBar(
  wedges: Wedge[],
  total: number,
  x: number,
  y: number,
  width: number,
  height: number,
  colorFor: (category: string) => string,
) {
  let currentX = x;
  const elements: React.ReactNode[] = [];

  wedges.forEach((w, i) => {
    const segmentWidth = total > 0 ? (w.value / total) * width : 0;

    // Bar segment
    elements.push(
      <rect
        key={`seg-${i}`}
        x={currentX}
        y={y}
        width={Math.max(0, segmentWidth)}
        height={height}
        fill={colorFor(w.category)}
        stroke="#fff"
        strokeWidth={1}
      />,
    );

    // Label (only if segment is wide enough)
    if (segmentWidth > 30) {
      elements.push(
        <text
          key={`lbl-${i}`}
          x={currentX + segmentWidth / 2}
          y={y + height / 2 + 4}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
          fontWeight={600}
        >
          {w.category}
        </text>,
      );
    }

    // Total at end of bar
    if (i === wedges.length - 1) {
      elements.push(
        <text
          key="pct"
          x={currentX + segmentWidth + 4}
          y={y + height / 2 + 4}
          fill="#666"
          fontSize={11}
        >
          {formatNumber(total)}
        </text>,
      );
    }

    currentX += segmentWidth;
  });

  return elements;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export const DistrictDetailView = memo(DistrictDetailViewImpl);
