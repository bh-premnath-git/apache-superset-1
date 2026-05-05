import * as React from 'react';
import { useMemo, useState } from 'react';
import { ui, SEGMENT_PALETTE } from '../theme';
import { SEGMENTS, STATES, hashShare } from '../data';
import { Card } from '../components/Card';
import { SegmentBars } from '../components/SegmentBars';

function ComparisonPicker({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: ui.color.textMuted }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 10px',
          fontSize: 13,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 6,
          background: ui.color.surface,
          color: ui.color.text,
        }}
      >
        {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );
}

export function ComparisonView() {
  const [left, setLeft] = useState('Maharashtra');
  const [right, setRight] = useState('Tamil Nadu');

  const leftRows = useMemo(
    () => SEGMENTS.map((s) => ({ ...s, share: +(s.share + (hashShare(left + s.segment) - 50) * 0.2).toFixed(1) })),
    [left],
  );
  const rightRows = useMemo(
    () => SEGMENTS.map((s) => ({ ...s, share: +(s.share + (hashShare(right + s.segment) - 50) * 0.2).toFixed(1) })),
    [right],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
          Comparison tool
        </h1>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>
          Side-by-side segment composition for two states. Dummy data shown.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title={left}>
          <ComparisonPicker label="State A" value={left} onChange={setLeft} />
          <div style={{ height: 14 }} />
          <SegmentBars rows={leftRows} palette={SEGMENT_PALETTE} />
        </Card>
        <Card title={right}>
          <ComparisonPicker label="State B" value={right} onChange={setRight} />
          <div style={{ height: 14 }} />
          <SegmentBars rows={rightRows} palette={SEGMENT_PALETTE} />
        </Card>
      </div>

      <Card title="Difference (A − B)" subtitle="Percentage-point gap by segment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leftRows.map((row, i) => {
            const diff = +(row.share - rightRows[i].share).toFixed(1);
            const positive = diff >= 0;
            return (
              <div key={row.segment} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px', alignItems: 'center', gap: 12, fontSize: 13 }}>
                <span>{row.segment}</span>
                <div style={{ position: 'relative', height: 6, background: ui.color.surfaceMuted, borderRadius: 3 }}>
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    width: `${Math.min(Math.abs(diff) * 4, 50)}%`,
                    height: '100%',
                    background: positive ? '#22c55e' : '#ef4444',
                    borderRadius: 3,
                    transform: positive ? 'translateX(0)' : 'translateX(-100%)',
                  }} />
                </div>
                <span style={{ textAlign: 'right', color: positive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {positive ? '+' : ''}{diff} pp
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
