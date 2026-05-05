import * as React from 'react';
import { ui } from '../theme';
import { StatusPill, StatusKind } from './StatusPill';

export type Note = { kind: StatusKind; title: string; body: string };

export function NoteList({ items }: { items: Note[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr',
          gap: 14,
          padding: '12px 14px',
          background: ui.color.surface,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 8,
        }}>
          <div><StatusPill kind={it.kind} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ui.color.text }}>{it.title}</div>
            <div style={{ fontSize: 12, color: ui.color.textMuted, marginTop: 4, lineHeight: 1.5 }}>
              {it.body}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
