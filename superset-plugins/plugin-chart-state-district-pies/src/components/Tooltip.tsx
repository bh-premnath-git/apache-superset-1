import React from 'react';

import type { DistrictRow } from '../types';

export interface TooltipProps {
  row: DistrictRow | null;
  x: number;
  y: number;
  containerWidth: number;
  colorFor: (category: string) => string;
}

/**
 * Lightweight tooltip positioned in pixel coordinates (the same frame the
 * d3 projection emits), with a simple edge-flip so it never clips the right
 * side of the container.
 */
export function Tooltip({
  row,
  x,
  y,
  containerWidth,
  colorFor,
}: TooltipProps) {
  if (!row) return null;
  const flip = x > containerWidth - 160;
  const total = row.totalWeight || 1;

  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        left: flip ? x - 168 : x + 12,
        top: y + 12,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: 12,
        padding: '6px 8px',
        pointerEvents: 'none',
        minWidth: 140,
        color: '#222',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {row.stateKey} · {row.districtKey}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 4 }}>
        {row.wedges.map(w => (
          <React.Fragment key={w.category}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                background: colorFor(w.category),
                borderRadius: 2,
                alignSelf: 'center',
              }}
            />
            <span>{w.category}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {((w.value / total) * 100).toFixed(1)}%
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
