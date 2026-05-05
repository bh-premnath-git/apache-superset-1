import * as React from 'react';
import { ui } from '../theme';

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{
      background: ui.color.surface,
      border: `1px solid ${ui.color.border}`,
      borderRadius: 10,
      padding: 16,
    }}>
      <div style={{ fontSize: 12, color: ui.color.textMuted }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: ui.color.text, marginTop: 4 }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: ui.color.textMuted, marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}
