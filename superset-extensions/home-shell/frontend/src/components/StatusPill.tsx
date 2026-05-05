import * as React from 'react';

export type StatusKind = 'live' | 'in-progress' | 'planned' | 'caveat';

const STATUS_STYLE: Record<StatusKind, { bg: string; fg: string; label: string }> = {
  live:          { bg: '#dcfce7', fg: '#166534', label: 'Live' },
  'in-progress': { bg: '#fef3c7', fg: '#92400e', label: 'In progress' },
  planned:       { bg: '#e0e7ff', fg: '#3730a3', label: 'Planned' },
  caveat:        { bg: '#fee2e2', fg: '#991b1b', label: 'Caveat' },
};

export function StatusPill({ kind }: { kind: StatusKind }) {
  const s = STATUS_STYLE[kind];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      background: s.bg,
      color: s.fg,
    }}>
      {s.label}
    </span>
  );
}
