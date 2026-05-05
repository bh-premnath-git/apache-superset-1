import * as React from 'react';
import { ui } from '../theme';

export function Card({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{
      background: ui.color.surface,
      border: `1px solid ${ui.color.border}`,
      borderRadius: 10,
      padding: 18,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <header style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ui.color.text }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: ui.color.textMuted }}>
            {subtitle}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
