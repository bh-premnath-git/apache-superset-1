import * as React from 'react';
import { useMemo, useState } from 'react';
import { ui } from '../theme';
import { CRM_DATA_VERSION_LABEL, CRM_M2_BANNER, LS } from '../crm';
import { ViewKey } from '../nav';
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function DashboardHomeView({
  onNavigate,
}: {
  onNavigate?: (k: ViewKey) => void;
}) {
  const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
    localStorage.getItem(LS.onboardingDismissed) === '1',
  );

  const saved = useMemo(() => readJson<string[]>(LS.savedSegments, []), []);
  const lastDistrict = useMemo(
    () => readJson<{ state: string; district: string } | null>(LS.lastDistrict, null),
    [],
  );
  const comparison = useMemo(() => readJson<string[]>(LS.comparisonDraft, []), []);

  const dismissOnboarding = () => {
    localStorage.setItem(LS.onboardingDismissed, '1');
    setOnboardingDismissed(true);
  };

  return (
    <div style={{ width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <section>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: ui.color.textMuted }}>
              Dashboard home
            </p>
            <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: ui.color.text }}>
              Welcome back
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: ui.color.textMuted, lineHeight: 1.55 }}>
              Personalised entry point after login. Quick links below use activity saved in this
              browser; FSP accounts can later wire this to your profile on the server.
            </p>
          </div>
          <div
            title="Structural segmentation release"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${ui.color.border}`,
              background: ui.color.surface,
              color: ui.color.text,
              whiteSpace: 'nowrap',
            }}
          >
            {CRM_DATA_VERSION_LABEL}
          </div>
        </div>

        {CRM_M2_BANNER && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              fontSize: 12,
              color: '#92400e',
            }}
          >
            {CRM_M2_BANNER}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: ui.color.text }}>Quick access</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <button
            type="button"
            onClick={() => onNavigate?.('overview')}
            style={quickCardStyle}
          >
            <strong style={{ fontSize: 13, color: ui.color.text }}>Your saved segments</strong>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: ui.color.textMuted, lineHeight: 1.45 }}>
              {saved.length
                ? `${saved.join(', ')} — open segment overview to manage.`
                : 'Nothing saved yet. Star segments from a profile (coming) or open the overview.'}
            </p>
            <span style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: ui.color.accent }}>Segments →</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('prevalence')}
            style={quickCardStyle}
          >
            <strong style={{ fontSize: 13, color: ui.color.text }}>Last viewed district</strong>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: ui.color.textMuted, lineHeight: 1.45 }}>
              {lastDistrict
                ? `${lastDistrict.district}, ${lastDistrict.state}`
                : 'No district stored yet. Open the prevalence map and pick a district.'}
            </p>
            <span style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: ui.color.accent }}>Map →</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('comparison')}
            style={quickCardStyle}
          >
            <strong style={{ fontSize: 13, color: ui.color.text }}>Comparison in progress</strong>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: ui.color.textMuted, lineHeight: 1.45 }}>
              {comparison.length >= 2
                ? `Draft: ${comparison.slice(0, 3).join(' vs ')}.`
                : 'No draft comparison. The tool will remember selected segments once wired.'}
            </p>
            <span style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: ui.color.accent }}>Compare →</span>
          </button>
        </div>
      </section>

      {!onboardingDismissed && (
        <section
          style={{
            border: `1px solid ${ui.color.border}`,
            borderRadius: 12,
            padding: 18,
            background: ui.color.surface,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ui.color.text }}>Getting started</h2>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: ui.color.textMuted, lineHeight: 1.5 }}>
                New to the CRM explorer? Follow these three steps (Pathways-style flow, FSP use case).
              </p>
            </div>
            <button
              type="button"
              onClick={dismissOnboarding}
              style={{
                fontSize: 11,
                padding: '6px 10px',
                borderRadius: 6,
                border: `1px solid ${ui.color.border}`,
                background: ui.color.surfaceMuted,
                cursor: 'pointer',
                fontFamily: ui.font,
              }}
            >
              Dismiss
            </button>
          </div>
          <ol style={{ margin: '14px 0 0', paddingLeft: 18, fontSize: 13, color: ui.color.text, lineHeight: 1.8 }}>
            <li>
              <button type="button" onClick={() => onNavigate?.('overview')} style={stepLinkStyle}>
                Explore segments
              </button>
              {' — '}see all seven CRM codes grouped by readiness tier.
            </li>
            <li>
              <button type="button" onClick={() => onNavigate?.('comparison')} style={stepLinkStyle}>
                Compare
              </button>
              {' — '}contrast indicators side-by-side for adjacent segments.
            </li>
            <li>
              <button type="button" onClick={() => onNavigate?.('prevalence')} style={stepLinkStyle}>
                View on map
              </button>
              {' — '}district concentration for market entry planning.
            </li>
          </ol>
        </section>
      )}

      <section style={{ fontSize: 12, color: ui.color.textMuted, lineHeight: 1.55 }}>
        <strong style={{ color: ui.color.text }}>Persistent navigation</strong>
        {' — '}Use the left rail for{' '}
        <em>Home</em>, <em>Segment overview</em>, each <em>segment profile</em>, then{' '}
        <em>Comparison</em>, <em>Data browser</em>, and <em>Prevalence map</em> under Analysis.
      </section>
    </div>
  );
}

const quickCardStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${ui.color.border}`,
  background: ui.color.surface,
  cursor: 'pointer',
  fontFamily: ui.font,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
};

const stepLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: ui.color.accent,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: ui.font,
  fontSize: 'inherit',
  textDecoration: 'underline',
};
