import React from 'react';

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
}

/**
 * Lightweight navigation breadcrumb for the drill-down map.
 * Renders as: India › Bihar › Patna  (clickable ancestors, bold current).
 */
export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        fontSize: 13,
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 6,
        padding: '4px 12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        userSelect: 'none',
      }}
      aria-label="Map navigation"
    >
      {segments.map((seg, i) => (
        <span key={`${i}-${seg.label}`} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && (
            <span style={{ margin: '0 4px', color: '#999' }}>›</span>
          )}
          {seg.onClick ? (
            <span
              role="button"
              tabIndex={0}
              onClick={seg.onClick}
              onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => e.key === 'Enter' && seg.onClick?.()}
              style={{
                color: '#1677ff',
                cursor: 'pointer',
              }}
            >
              {seg.label}
            </span>
          ) : (
            <span style={{ color: '#333', fontWeight: 600 }}>{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
