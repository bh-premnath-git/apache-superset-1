import * as React from 'react';
import { ui } from '../theme';

export function PageHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
        {title}
      </h1>
      <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>{lede}</p>
    </div>
  );
}
