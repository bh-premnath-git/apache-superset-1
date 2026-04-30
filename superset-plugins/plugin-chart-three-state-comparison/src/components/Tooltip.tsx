import React from 'react';

export interface TooltipDatum {
  segment: string;
  color: string;
  value: number;
  percentage: number;
  state?: string;
  x: number;
  y: number;
}

interface TooltipProps {
  data: TooltipDatum | null;
  containerWidth: number;
  containerHeight: number;
  decimals: number;
  metricLabel?: string;
}

const TOOLTIP_WIDTH = 180;
const TOOLTIP_OFFSET = 14;

export const Tooltip: React.FC<TooltipProps> = ({
  data,
  containerWidth,
  containerHeight,
  decimals,
  metricLabel = 'Value',
}) => {
  if (!data) return null;

  // Flip horizontally if it would overflow the container.
  const flipX = data.x + TOOLTIP_OFFSET + TOOLTIP_WIDTH > containerWidth;
  const left = flipX ? data.x - TOOLTIP_OFFSET - TOOLTIP_WIDTH : data.x + TOOLTIP_OFFSET;
  const top = Math.min(Math.max(data.y - 12, 8), containerHeight - 80);

  const formattedValue = Number.isFinite(data.value)
    ? data.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '—';

  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        left,
        top,
        width: TOOLTIP_WIDTH,
        pointerEvents: 'none',
        background: 'rgba(17, 24, 39, 0.94)',
        color: '#f9fafb',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow:
          '0 10px 24px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.12)',
        backdropFilter: 'blur(6px)',
        transition: 'left 80ms ease-out, top 80ms ease-out',
        zIndex: 10,
      }}
    >
      {data.state && (
        <div
          style={{
            fontSize: 11,
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: 4,
          }}
        >
          {data.state}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: data.color,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{data.segment}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
        <span>{metricLabel}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formattedValue}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ opacity: 0.85 }}>Share</span>
        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {data.percentage.toFixed(decimals)}%
        </span>
      </div>
    </div>
  );
};
