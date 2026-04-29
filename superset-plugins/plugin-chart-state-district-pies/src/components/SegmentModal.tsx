import React, { useEffect, useRef } from 'react';

import type { SegmentDescription, SegmentThemeCard } from '../constants';

export interface SegmentModalProps {
  segment: string;
  description: SegmentDescription;
  /** Background swatch shown next to the segment code in the modal header. */
  swatchColor: string;
  onClose: () => void;
}

/**
 * Plain-overlay modal opened by clicking a segment label on the detail
 * page tables. Deliberately does not depend on antd or Superset's modal —
 * keeps the federated bundle minimal and avoids style leaks from the host.
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true"
 *   - aria-labelledby points at the title element
 *   - ESC closes
 *   - Click on the backdrop closes
 *   - Initial focus moves to the close button
 */
export function SegmentModal({
  segment,
  description,
  swatchColor,
  onClose,
}: SegmentModalProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const segmentBand = segment.toUpperCase().startsWith('U') ? 'Urban' : 'Rural';
  const accent = headerAccentFor(segment, swatchColor);
  const overview = description.overview ?? description.summary;
  const cards = description.cards ?? {};

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const titleId = `sdp-segment-modal-${segment}`;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,20,30,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: 'min(1120px, 96vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          fontFamily: 'Inter, Arial, sans-serif',
          color: '#1b2234',
        }}
      >
        <header
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'start',
            gap: 14,
            background: accent,
            color: '#233449',
            borderBottom: '1px solid rgba(0,0,0,0.2)',
            padding: '12px 16px 10px',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 31, fontWeight: 500, color: 'rgba(32,50,70,0.55)' }}>
              {segmentBand} Segment: {segment}
            </div>
            <div>
              <div
                id={titleId}
                style={{ fontSize: 50, fontWeight: 500, lineHeight: 1.02, marginTop: -2 }}
              >
                {description.title}
              </div>
              {description.subtitle && (
                <div style={{ fontSize: 39, lineHeight: 1, marginTop: 2, color: 'rgba(25,35,55,0.78)' }}>
                  {description.subtitle}
                </div>
              )}
              {description.headerTagline && (
                <div style={{ marginTop: 6, fontSize: 15, color: 'rgba(29,44,63,0.85)' }}>
                  {description.headerTagline}
                </div>
              )}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close segment description"
            style={{
              padding: '6px 10px',
              fontSize: 12,
              background: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(0,0,0,0.2)',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              color: '#27364b',
            }}
          >
            Close
          </button>
        </header>

        <div style={{ padding: 12, background: '#f5f6fa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            <StatCard
              label="Prevalence Overall"
              value={description.prevalenceOverall ?? '—'}
            />
            <StatCard
              label="Prevalence Bihar | Jharkhand | MP"
              value={description.prevalenceRegional ?? '—'}
            />
            <StatCard
              label="Readiness"
              value={description.readiness ?? 'No readiness narrative configured for this segment.'}
            />
          </div>

          {overview && (
            <section style={panelStyle}>
              <div style={{ fontSize: 27, fontWeight: 700, marginBottom: 4 }}>Overview:</div>
              <div style={{ fontSize: 15, lineHeight: 1.45 }}>{overview}</div>
            </section>
          )}

          {(cards.economic || cards.welfare || cards.digital || cards.vulnerability) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {renderCard('payments', cards.economic, '#1b63c8', 'Economic')}
              {renderCard('volunteer_activism', cards.welfare, '#0ba86d', 'Welfare')}
              {renderCard('devices', cards.digital, '#7c50e8', 'Digital')}
              {renderCard('health_and_safety', cards.vulnerability, '#ef4444', 'Vulnerability')}
            </div>
          )}

          {description.criteria && description.criteria.length > 0 && (
            <DescriptionList label="Classification criteria" items={description.criteria} />
          )}

          {description.interventions && description.interventions.length > 0 && (
            <DescriptionList label="Suggested interventions" items={description.interventions} />
          )}
        </div>
      </div>
    </div>
  );
}

function headerAccentFor(segment: string, fallback: string): string {
  if (segment.toUpperCase().startsWith('U')) return '#cddceb';
  if (segment.toUpperCase() === 'R3') return '#f08a17';
  if (segment.toUpperCase() === 'R4') return '#b96906';
  if (segment.toUpperCase().startsWith('R')) return '#e8c093';
  return fallback;
}

function renderCard(
  iconWord: string,
  card: SegmentThemeCard | undefined,
  color: string,
  fallbackTitle: string,
) {
  if (!card) return null;
  return (
    <section style={{ ...panelStyle, marginTop: 0, minHeight: 214 }} key={iconWord}>
      <div style={{ fontSize: 49, color, lineHeight: 1, fontWeight: 500 }}>{iconWord}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{card.title || fallbackTitle}</div>
      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.44, color: '#24324a' }}>{card.body}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const compact = value.length < 40;
  return (
    <section style={{ ...panelStyle, marginTop: 0, minHeight: 82 }}>
      <div style={{ fontSize: 18, fontWeight: 500, color: '#5b677a' }}>{label}</div>
      <div
        style={{
          marginTop: 4,
          fontSize: compact ? 40 : 17,
          lineHeight: compact ? 1 : 1.3,
          fontWeight: compact ? 700 : 500,
          color: '#1a2335',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </section>
  );
}

function DescriptionList({ label, items }: { label: string; items: string[] }) {
  return (
    <section style={{ ...panelStyle, marginTop: 10 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#4d5a6f',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.45, color: '#233449' }}>
        {items.map((item, i) => (
          <li key={`${label}-${i}`} style={{ marginBottom: 2 }}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#eef1f6',
  border: '1px solid rgba(0,0,0,0.25)',
  borderRadius: 10,
  padding: '10px 12px',
  marginTop: 8,
};
