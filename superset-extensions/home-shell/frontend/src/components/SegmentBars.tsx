import * as React from 'react';
import { ui } from '../theme';
import type { SegmentRow } from '../data';

export function SegmentBars({ rows, palette }: { rows: SegmentRow[]; palette: string[] }) {
  const max = Math.max(...rows.map((r) => r.share));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={r.segment} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 56px', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <div style={{ color: ui.color.text, fontWeight: 500 }}>{r.segment}</div>
          <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${(r.share / max) * 100}%`,
              height: '100%',
              background: palette[i % palette.length],
              borderRadius: 4,
            }} />
          </div>
          <div style={{ textAlign: 'right', color: ui.color.textMuted }}>{r.share.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}
