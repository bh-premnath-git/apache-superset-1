import * as React from 'react';
import { ui } from '../theme';
import { api, useFetch } from '../api';
import { ViewKey } from '../nav';
import { TIER_META, TIER_ORDER } from '../crm';

// Screen 0 — Landing / Buy-in.
//
// In the canonical CRM Segment Explorer spec this is the public screen
// shown to FSP visitors before they request access. Inside the home-shell
// extension Superset is already auth-gated, so this view doubles as the
// "business case" intro for first-time logged-in users — same content,
// same CTAs (which inside the shell jump to the Dashboard Home).

function fmtInt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-IN');
}

function PillarCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 12,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          background: ui.color.surfaceMuted,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        {icon}
      </span>
      <strong style={{ fontSize: 15, color: ui.color.text }}>{title}</strong>
      <p style={{ margin: 0, fontSize: 13, color: ui.color.textMuted, lineHeight: 1.55 }}>
        {body}
      </p>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 34, fontWeight: 700, color: ui.color.text, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: ui.color.textMuted, letterSpacing: 0.3 }}>
        {label}
      </span>
    </div>
  );
}

export function LandingView({ onNavigate }: { onNavigate?: (k: ViewKey) => void } = {}) {
  const summary = useFetch(() => api.summary(), []);

  const totalHh = summary.data?.weighted_households;
  const districts = summary.data?.districts_covered;
  const states = summary.data?.states_focus ?? ['Bihar', 'Madhya Pradesh', 'Jharkhand'];

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* Hero */}
      <section>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: ui.color.chipText,
            background: ui.color.chip,
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          CRM Segment Explorer · M1 Structural Segmentation
        </span>
        <h1
          style={{
            margin: '14px 0 0',
            fontSize: 34,
            fontWeight: 700,
            color: ui.color.text,
            lineHeight: 1.2,
          }}
        >
          {fmtInt(totalHh)} underserved households in {states.join(', ')} —
          segmented by financial readiness.
        </h1>
        <p
          style={{
            margin: '14px 0 0',
            color: ui.color.textMuted,
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 760,
          }}
        >
          The Customer Readiness Metric (CRM) makes the structural opportunity
          visible to FSPs, MFIs, insurers and DFIs. Pick your geography, see
          which segment maps to your product, and leave with a clear picture
          of who that customer is, where they are concentrated, and how to
          reach them.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onNavigate?.('home')}
            style={{
              padding: '12px 22px',
              border: 'none',
              borderRadius: 8,
              background: ui.color.text,
              color: ui.color.surface,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: ui.font,
            }}
          >
            Open the dashboard →
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('overview')}
            style={{
              padding: '12px 22px',
              border: `1px solid ${ui.color.border}`,
              borderRadius: 8,
              background: ui.color.surface,
              color: ui.color.text,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: ui.font,
            }}
          >
            Browse all segments
          </button>
        </div>
      </section>

      {/* Hero stats */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 24,
          padding: '24px 28px',
          border: `1px solid ${ui.color.border}`,
          borderRadius: 12,
          background: ui.color.surface,
        }}
      >
        <HeroStat value={fmtInt(totalHh)} label="Weighted households" />
        <HeroStat value="7" label="Population segments" />
        <HeroStat value="4" label="Readiness tiers" />
        <HeroStat value={`${fmtInt(districts)}`} label="Districts covered" />
      </section>

      {/* Value pillars */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 14,
          }}
        >
          What you can do with CRM
        </h2>
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          <PillarCard
            icon="🎯"
            title="Identify your market"
            body="Filter to the segment that fits your product hypothesis — credit, savings, micro-insurance or protection cover."
          />
          <PillarCard
            icon="🗺️"
            title="Prioritise your geography"
            body="District-level prevalence shows where your target segment is concentrated, before you commit to a market entry plan."
          />
          <PillarCard
            icon="📡"
            title="Activate the right channel"
            body="Each segment carries a sequenced channel ladder — SHG, BC Sakhi, FPS, ASHA, CSC, bancassurance — calibrated to readiness."
          />
        </div>
      </section>

      {/* Tier preview */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 14,
          }}
        >
          Four readiness tiers · seven segments
        </h2>
        <p style={{ margin: '8px 0 16px', fontSize: 13, color: ui.color.textMuted, lineHeight: 1.5 }}>
          Segments cluster into four readiness tiers based on FSP entry strategy, not just vulnerability.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TIER_ORDER.map((t) => {
            const meta = TIER_META[t];
            return (
              <div
                key={t}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr 220px',
                  gap: 16,
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: ui.color.surface,
                  border: `1px solid ${ui.color.border}`,
                  borderRadius: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: meta.badgeBg,
                    color: meta.badgeColor,
                    width: 'fit-content',
                  }}
                >
                  {meta.label}
                </span>
                <span style={{ fontSize: 13, color: ui.color.text, lineHeight: 1.5 }}>
                  {meta.tagline}
                </span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {meta.members.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onNavigate?.(`segment:${m}` as ViewKey)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 999,
                        background: ui.color.surfaceMuted,
                        color: ui.color.text,
                        border: `1px solid ${ui.color.border}`,
                        cursor: 'pointer',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer / methodology */}
      <section
        style={{
          padding: '14px 18px',
          background: ui.color.surfaceMuted,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 10,
          fontSize: 12,
          color: ui.color.textMuted,
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: ui.color.text }}>Methodology · M1 Structural Segmentation</strong>
        <br />
        Built on NSSO HCES 2023-24 household microdata, weighted by survey weight <code>wt</code>, restricted to Bihar, MP and Jharkhand. M2 (behavioural + outcome data) will be added as a new version layer when available — current release is <code>IND_LCA_2024_v1</code>.
        SBC Labs · Swadhaar · May 2026 · v1.0
      </section>
    </div>
  );
}
