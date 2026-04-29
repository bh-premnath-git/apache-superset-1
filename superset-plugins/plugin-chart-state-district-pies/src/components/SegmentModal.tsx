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
          borderRadius: 10,
          width: 'min(800px, 94vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif',
          color: '#1b2234',
        }}
      >
        <header
          style={{
            position: 'relative',
            background: accent,
            color: '#233449',
            borderBottom: '1px solid rgba(0,0,0,0.12)',
            padding: '10px 14px',
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(32,50,70,0.6)',
                background: 'rgba(255,255,255,0.35)',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {segmentBand} · {segment}
            </span>
          </div>
          <div>
            <div
              id={titleId}
              style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.25, marginTop: 4 }}
            >
              {description.title}
            </div>
            {description.subtitle && (
              <div style={{ fontSize: 14, lineHeight: 1.35, marginTop: 2, color: 'rgba(25,35,55,0.75)' }}>
                {description.subtitle}
              </div>
            )}
            {description.headerTagline && (
              <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(29,44,63,0.7)' }}>
                {description.headerTagline}
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              lineHeight: 1,
              background: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: '50%',
              cursor: 'pointer',
              color: '#445566',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.85)';
              e.currentTarget.style.color = '#223344';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
              e.currentTarget.style.color = '#445566';
            }}
          >
            ×
          </button>
        </header>

        <div style={{ padding: 8, background: '#f6f7f9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 }}>
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
            <section style={{ ...panelStyle, padding: '8px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#556577', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                Overview
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#2a3449', wordBreak: 'break-word' }}>{overview}</div>
            </section>
          )}

          {(cards.economic || cards.welfare || cards.digital || cards.vulnerability) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 6,
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
    <section style={{ ...panelStyle, marginTop: 0, padding: '8px 10px' }} key={iconWord}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px' }}>
        <span style={{ fontSize: 18, color, lineHeight: 1, flexShrink: 0 }}>{iconWord}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', lineHeight: 1.3 }}>{card.title || fallbackTitle}</span>
      </div>
      <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.5, color: '#445066', wordBreak: 'break-word' }}>{card.body}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const compact = value.length < 50;
  return (
    <section style={{ ...panelStyle, marginTop: 0, padding: '8px 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#667289', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.3 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 3,
          fontSize: compact ? 20 : 13,
          lineHeight: compact ? 1.2 : 1.45,
          fontWeight: compact ? 700 : 500,
          color: compact ? '#1a2335' : '#3a4559',
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
    <section style={{ ...panelStyle, marginTop: 6, padding: '8px 10px' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#556577',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <ul style={{ margin: 0, paddingLeft: 14, fontSize: 12, lineHeight: 1.5, color: '#3a4559' }}>
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
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: 6,
  padding: '8px 10px',
  marginTop: 6,
  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};
