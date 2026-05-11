import * as React from 'react';
import { useMemo, useState } from 'react';
import { ui } from '../theme';
import { api, useFetch, MpceRow, BinaryMetricValues, MetricValues } from '../api';
import { ViewKey } from '../nav';
import { CompareIcon, MapIcon, OverviewIcon } from '../icons';
import { CRM_DATA_VERSION_LABEL, CRM_FOCUS_STATES } from '../crm';

// Warehouse: household.hh_master → vw_hh_segments → vw_state_segment_distribution.
// CRM pathway tiers (T1–T4) are FSP strategy groupings from the product spec — not extra SQL columns.

type Band = 'Rural' | 'Urban';

interface SegmentDef {
  code: string;
  band: Band;
  label: string;
  rule: string;
  level: 1 | 2 | 3 | 4;
  /** FSP-facing readiness band for card chrome */
  readinessPill: 'High' | 'Mid' | 'Low';
  oneLine: string;
  persona: string;
}

const SEGMENT_DEFS: Record<string, SegmentDef> = {
  R1: {
    code: 'R1',
    band: 'Rural',
    label: 'Connected, asset-rich rural',
    rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
    level: 1,
    readinessPill: 'High',
    oneLine: 'Strong digital + assets — lead with digital credit and insurance attach.',
    persona: '🌾',
  },
  R2: {
    code: 'R2',
    band: 'Rural',
    label: 'Digitally engaged rural',
    rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not R1)',
    level: 2,
    readinessPill: 'Mid',
    oneLine: 'Mobile-first; bridge formal products via BC and assisted journeys.',
    persona: '📱',
  },
  R3: {
    code: 'R3',
    band: 'Rural',
    label: 'Low-connectivity rural',
    rule: 'digital_score ≤ 1 AND internet_access = 0',
    level: 3,
    readinessPill: 'Low',
    oneLine: 'System linkage first — ASHA / FPS / CSC before app-led acquisition.',
    persona: '🏚️',
  },
  R4: {
    code: 'R4',
    band: 'Rural',
    label: 'Most constrained rural',
    rule: 'fallback — none of R1/R2/R3 apply',
    level: 4,
    readinessPill: 'Low',
    oneLine: 'Protection and PM-JAY / Jan Dhan rails; small-ticket, assisted channels.',
    persona: '🛖',
  },
  U1: {
    code: 'U1',
    band: 'Urban',
    label: 'Connected, asset-rich urban',
    rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
    level: 1,
    readinessPill: 'High',
    oneLine: 'Urban salaried / SME adjacency — cards, EMI, and partner-led digital.',
    persona: '🏙️',
  },
  U2: {
    code: 'U2',
    band: 'Urban',
    label: 'Digitally engaged urban',
    rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not U1)',
    level: 2,
    readinessPill: 'Mid',
    oneLine: 'POS / wallet-led; cross-sell from telecom and e-commerce touchpoints.',
    persona: '🏬',
  },
  U3: {
    code: 'U3',
    band: 'Urban',
    label: 'Most constrained urban',
    rule: 'fallback — neither U1 nor U2 applies',
    level: 4,
    readinessPill: 'Mid',
    oneLine: 'Informal urban — group-based liability and cash-heavy servicing.',
    persona: '🏘️',
  },
};

const SEGMENT_ORDER = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'] as const;

/** FSP pathway tiers (spec): default clustering on the overview. */
const CRM_PATHWAY_TIERS = [
  {
    key: 't1',
    tag: 'T1',
    title: 'Direct FSP uptake',
    detail: 'R1 + U3',
    codes: ['R1', 'U3'] as const,
  },
  {
    key: 't2',
    tag: 'T2',
    title: 'Welfare bridge',
    detail: 'R2 + U2',
    codes: ['R2', 'U2'] as const,
  },
  {
    key: 't3',
    tag: 'T3',
    title: 'Protection entry',
    detail: 'R4 + U1',
    codes: ['R4', 'U1'] as const,
  },
  {
    key: 't4',
    tag: 'T4',
    title: 'System linkage precondition',
    detail: 'R3',
    codes: ['R3'] as const,
  },
] as const;

const TIER_HEAD_STYLE: Record<string, { tagBg: string; tagColor: string }> = {
  T1: { tagBg: '#dbeafe', tagColor: '#1e3a8a' },
  T2: { tagBg: '#e0f2fe', tagColor: '#0369a1' },
  T3: { tagBg: '#fef3c7', tagColor: '#92400e' },
  T4: { tagBg: '#fce7f3', tagColor: '#9d174d' },
};

type ViewBy = 'pathway' | 'band' | 'prevalence';

const PILL_STYLE: Record<'High' | 'Mid' | 'Low', { bg: string; fg: string }> = {
  High: { bg: '#dcfce7', fg: '#166534' },
  Mid: { bg: '#fef9c3', fg: '#854d0e' },
  Low: { bg: '#ffe4e6', fg: '#9f1239' },
};

function fmtInt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-IN');
}

function fmtPct(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(0)}%`;
}

function fmtCurrency(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function binaryForSegment(m: MetricValues, code: string): number | undefined {
  if (m.type !== 'binary') return undefined;
  return m.values.find((v) => v.segment === code)?.share_pct;
}

function SegmentCard({
  def,
  share,
  stateSplit,
  mpce,
  internetPct,
  rationPct,
  onOpen,
  onCompare,
}: {
  def: SegmentDef;
  share: number | undefined;
  stateSplit: Record<string, number>;
  mpce: MpceRow | undefined;
  internetPct: number | undefined;
  rationPct: number | undefined;
  onOpen: () => void;
  onCompare: () => void;
}) {
  const ps = PILL_STYLE[def.readinessPill];
  const tip = [
    `Mean MPCE (segment): ${fmtCurrency(mpce?.mean_mpce)}`,
    `Any internet (HH): ${fmtPct(internetPct)}`,
    `Ration card (HH): ${fmtPct(rationPct)}`,
  ].join('\n');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      title={tip}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
        padding: 14,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: ui.font,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        minHeight: 200,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>{def.persona}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            background: ui.color.surfaceMuted,
            color: ui.color.text,
          }}
        >
          {def.code}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            padding: '3px 8px',
            borderRadius: 999,
            background: ps.bg,
            color: ps.fg,
            marginLeft: 'auto',
          }}
        >
          {def.readinessPill}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: ui.color.text }}>{def.label}</div>
        <div style={{ fontSize: 11, color: ui.color.textMuted, marginTop: 4, lineHeight: 1.45 }}>
          {def.oneLine}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ui.color.text }}>
        {fmtPct(share)} <span style={{ fontWeight: 400, color: ui.color.textMuted }}>of focus-state population</span>
      </div>
      <div style={{ display: 'flex', gap: 3, height: 6, borderRadius: 3, overflow: 'hidden' }} aria-hidden>
        {CRM_FOCUS_STATES.map((st) => (
          <div
            key={st}
            title={`${st}: ${fmtPct(stateSplit[st] ?? 0)} of segment weight`}
            style={{
              flex: Math.max(0.05, (stateSplit[st] ?? 0) / 100),
              background: st === 'Bihar' ? '#93c5fd' : st === 'Jharkhand' ? '#86efac' : '#c4b5fd',
              minWidth: 2,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 10, color: ui.color.textMuted, display: 'flex', justifyContent: 'space-between' }}>
        <span>Bihar</span>
        <span>JH</span>
        <span>MP</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onOpen();
          }}
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: 600,
            padding: '6px 8px',
            borderRadius: 6,
            border: `1px solid ${ui.color.border}`,
            background: ui.color.surfaceMuted,
            cursor: 'pointer',
            fontFamily: ui.font,
          }}
        >
          Profile
        </button>
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onCompare();
          }}
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: 600,
            padding: '6px 8px',
            borderRadius: 6,
            border: `1px solid ${ui.color.border}`,
            background: ui.color.surface,
            cursor: 'pointer',
            fontFamily: ui.font,
          }}
        >
          Compare
        </button>
      </div>
    </div>
  );
}

function ViewByToggle({ value, onChange }: { value: ViewBy; onChange: (v: ViewBy) => void }) {
  const opts: { key: ViewBy; label: string }[] = [
    { key: 'pathway', label: 'By readiness tier' },
    { key: 'band', label: 'Rural / Urban' },
    { key: 'prevalence', label: 'By prevalence' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
      <span style={{ color: ui.color.textMuted }}>View by:</span>
      <div style={{ display: 'inline-flex', border: `1px solid ${ui.color.border}`, borderRadius: 6, overflow: 'hidden' }}>
        {opts.map((o, i) => {
          const active = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              style={{
                padding: '6px 10px',
                background: active ? ui.color.surfaceMuted : ui.color.surface,
                color: active ? ui.color.text : ui.color.textMuted,
                border: 'none',
                borderLeft: i === 0 ? 'none' : `1px solid ${ui.color.border}`,
                fontFamily: ui.font,
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: ui.color.textMuted, letterSpacing: 0.2 }}>{label}</span>
      <span style={{ fontSize: 13, color: ui.color.text }}>{children}</span>
    </div>
  );
}

function DiveCard({
  icon,
  title,
  body,
  cta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: 'pointer',
        fontFamily: ui.font,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: ui.color.surfaceMuted,
          color: ui.color.text,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </span>
      <strong style={{ fontSize: 15, color: ui.color.text }}>{title}</strong>
      <p style={{ margin: 0, fontSize: 13, color: ui.color.textMuted, lineHeight: 1.5 }}>{body}</p>
      <span style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: ui.color.accent }}>{cta} →</span>
    </button>
  );
}

export function OverviewView({ onNavigate }: { onNavigate?: (k: ViewKey) => void } = {}) {
  const summary = useFetch(() => api.summary(), []);
  const segments = useFetch(() => api.segments(), []);
  const statesSeg = useFetch(() => api.statesSegments([...CRM_FOCUS_STATES]), []);
  const mpce = useFetch(() => api.mpce(), []);
  const tipMetrics = useFetch(() => api.metricsValues(['any_internet', 'ration_card'], [...CRM_FOCUS_STATES]), []);

  const [viewBy, setViewBy] = useState<ViewBy>('pathway');

  const sharesByCode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of segments.data?.segments ?? []) map[row.segment] = row.share_pct;
    return map;
  }, [segments.data]);

  const mpceByCode = useMemo(() => {
    const map: Record<string, MpceRow> = {};
    for (const row of mpce.data?.segments ?? []) map[row.segment] = row;
    return map;
  }, [mpce.data]);

  const internetByCode = useMemo(() => {
    const m = tipMetrics.data?.metrics?.find((x) => x.key === 'any_internet') as BinaryMetricValues | undefined;
    const out: Record<string, number> = {};
    if (!m || m.type !== 'binary') return out;
    for (const v of m.values) out[v.segment] = v.share_pct;
    return out;
  }, [tipMetrics.data]);

  const rationByCode = useMemo(() => {
    const m = tipMetrics.data?.metrics?.find((x) => x.key === 'ration_card') as BinaryMetricValues | undefined;
    const out: Record<string, number> = {};
    if (!m || m.type !== 'binary') return out;
    for (const v of m.values) out[v.segment] = v.share_pct;
    return out;
  }, [tipMetrics.data]);

  const stateSplitBySegment = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    const rows = statesSeg.data?.states ?? [];
    const weights: Record<string, Record<string, number>> = {};
    for (const code of SEGMENT_ORDER) {
      weights[code] = { Bihar: 0, Jharkhand: 0, 'Madhya Pradesh': 0 };
    }
    for (const st of rows) {
      for (const seg of st.segments) {
        if (!weights[seg.segment]) continue;
        weights[seg.segment][st.state] = seg.weighted_count ?? 0;
      }
    }
    for (const code of SEGMENT_ORDER) {
      const w = weights[code];
      const tot = w.Bihar + w.Jharkhand + w['Madhya Pradesh'];
      if (tot <= 0) {
        out[code] = { Bihar: 0, Jharkhand: 0, 'Madhya Pradesh': 0 };
        continue;
      }
      out[code] = {
        Bihar: (w.Bihar / tot) * 100,
        Jharkhand: (w.Jharkhand / tot) * 100,
        'Madhya Pradesh': (w['Madhya Pradesh'] / tot) * 100,
      };
    }
    return out;
  }, [statesSeg.data]);

  const allDefs = SEGMENT_ORDER.map((c) => SEGMENT_DEFS[c]);

  const sumShare = (defs: SegmentDef[]) =>
    defs.reduce((acc, d) => acc + (sharesByCode[d.code] ?? 0), 0);

  const groups: { key: string; tag: string; title: string; subtitle?: string; total: number; defs: SegmentDef[] }[] =
    useMemo(() => {
      if (viewBy === 'band') {
        const rural = allDefs.filter((d) => d.band === 'Rural');
        const urban = allDefs.filter((d) => d.band === 'Urban');
        return [
          { key: 'rural', tag: 'R', title: 'Rural households', total: sumShare(rural), defs: rural },
          { key: 'urban', tag: 'U', title: 'Urban households', total: sumShare(urban), defs: urban },
        ];
      }
      if (viewBy === 'prevalence') {
        const sorted = [...allDefs].sort((a, b) => (sharesByCode[b.code] ?? 0) - (sharesByCode[a.code] ?? 0));
        return [{ key: 'prevalence', tag: '#', title: 'Largest to smallest (prevalence)', total: sumShare(sorted), defs: sorted }];
      }
      return CRM_PATHWAY_TIERS.map((t) => ({
        key: t.key,
        tag: t.tag,
        title: `${t.title}`,
        subtitle: t.detail,
        total: sumShare(t.codes.map((c) => SEGMENT_DEFS[c])),
        defs: t.codes.map((c) => SEGMENT_DEFS[c]),
      }));
    }, [viewBy, sharesByCode]);

  const fetchError = summary.error ?? segments.error;
  const states = summary.data?.states_focus ?? ['Bihar', 'Jharkhand', 'Madhya Pradesh'];

  const scrollToLimitations = () => {
    document.getElementById('crm-methodology-limitations')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 36 }}>
      <section>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: ui.color.textMuted }}>
          CRM Segment Explorer
        </p>
        <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: ui.color.text, lineHeight: 1.25 }}>
          CRM Population Segments — Bihar, MP &amp; Jharkhand
        </h1>
        <p style={{ margin: '12px 0 0', color: ui.color.textMuted, fontSize: 13, lineHeight: 1.6 }}>
          Primary FSP entry: seven CRM codes (R1–R4, U1–U3) from{' '}
          <code>household.vw_hh_segments</code>, with weighted shares from{' '}
          <code>vw_state_segment_distribution</code> (survey weight <code>wt</code>). Default view groups
          codes by the programme pathway tiers below; toggle Rural/Urban or prevalence to explore.
        </p>

        {fetchError && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: `1px solid ${ui.color.border}`,
              borderRadius: 8,
              color: '#b00020',
              fontSize: 12,
              background: '#fff5f5',
            }}
          >
            Could not load live segmentation data: {fetchError.message}. Showing segment definitions only.
          </div>
        )}

        <div
          id="crm-methodology"
          style={{
            marginTop: 18,
            border: `1px solid ${ui.color.border}`,
            borderRadius: 8,
            padding: '14px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 18,
            background: ui.color.surface,
          }}
        >
          <MetaCell label="Data source">NSSO HCES (household.hh_master)</MetaCell>
          <MetaCell label="Sample population">Rural &amp; urban households (focus states)</MetaCell>
          <MetaCell label="Sample size">
            {summary.loading ? '…' : fmtInt(summary.data?.weighted_households)} weighted hh
          </MetaCell>
          <MetaCell label="Geographic coverage">
            <span>{states.join(', ')}</span>
            <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: ui.color.textMuted }}>
              {summary.loading ? '…' : fmtInt(summary.data?.districts_covered)} districts
            </span>
          </MetaCell>
        </div>
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 8,
            background: ui.color.surfaceMuted,
            fontSize: 12,
            color: ui.color.textMuted,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: ui.color.text }}>LCA note:</strong> segments are rule-based on digital, asset, and
          connectivity scores (not a credit score). Figures are survey-weighted and directional for strategy — not a
          substitute for underwriting or regulatory filings.{' '}
          <button
            type="button"
            onClick={scrollToLimitations}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: ui.color.accent,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: ui.font,
              textDecoration: 'underline',
              fontSize: 'inherit',
            }}
          >
            Limitations detail
          </button>
          {' '}below. A full methodology PDF can replace this block when ready.
        </div>
        <div
          id="crm-methodology-limitations"
          tabIndex={-1}
          style={{ scrollMarginTop: 72, marginTop: 14, fontSize: 12, color: ui.color.textMuted, lineHeight: 1.65 }}
        >
          <strong style={{ color: ui.color.text }}>Limitations (summary):</strong> NSSO sampling and recall error;
          structural CRM codes do not capture informal income or informal debt; focus-state restriction excludes other
          markets; segment rules are versioned (see <code>002_lca_segment_views.sql</code>); map and comparison tools may
          round differently than raw SQL extracts.
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 10,
            color: ui.color.textMuted,
            marginTop: 8,
            padding: '0 2px',
          }}
        >
          <span>Refreshed from PostgreSQL views in the Analytics warehouse</span>
          <span style={{ fontWeight: 600, color: ui.color.text }}>{CRM_DATA_VERSION_LABEL}</span>
        </div>
      </section>

      <section style={{ width: '100%', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
            width: '100%',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: ui.color.text }}>
            All seven segments at a glance
          </h2>
          <ViewByToggle value={viewBy} onChange={setViewBy} />
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 22, width: '100%', minWidth: 0 }}>
          {groups.map((g) => {
            const tierStyle = TIER_HEAD_STYLE[g.tag] ?? { tagBg: ui.color.surfaceMuted, tagColor: ui.color.text };
            const showPathwayChrome = viewBy === 'pathway';
            return (
              <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%' }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: tierStyle.tagBg,
                      color: tierStyle.tagColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {g.tag}
                  </span>
                  <span style={{ fontSize: 14, color: ui.color.text, fontWeight: 700 }}>{g.title}</span>
                  {showPathwayChrome && g.subtitle && (
                    <span style={{ fontSize: 12, color: ui.color.textMuted }}>({g.subtitle})</span>
                  )}
                  <span style={{ fontSize: 12, color: ui.color.textMuted }}>· {fmtPct(g.total)} of population</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    width: '100%',
                    minWidth: 0,
                    gap: 12,
                    /* auto-fit collapses empty tracks so 2 cards share the full row; auto-fill left dead columns */
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                  }}
                >
                  {g.defs.map((d) => (
                    <React.Fragment key={d.code}>
                      <SegmentCard
                        def={d}
                        share={sharesByCode[d.code]}
                        stateSplit={stateSplitBySegment[d.code] ?? { Bihar: 0, Jharkhand: 0, 'Madhya Pradesh': 0 }}
                        mpce={mpceByCode[d.code]}
                        internetPct={internetByCode[d.code]}
                        rationPct={rationByCode[d.code]}
                        onOpen={() => {
                          onNavigate?.(`segment:${d.code}` as ViewKey);
                        }}
                        onCompare={() => {
                          onNavigate?.('comparison');
                        }}
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 18, fontSize: 12, color: ui.color.textMuted, lineHeight: 1.6 }}>
          Hover a card for mean MPCE, internet access, and ration-card incidence (weighted % within the segment).
          Pathway tiers follow the CRM programme design; SQL assignment rules still use R1–U3 / R1–R4 LCA logic.
        </p>
      </section>

      <section>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: ui.color.text, borderTop: `2px solid ${ui.color.text}`, paddingTop: 12 }}>
          Dive deeper into the data
        </h2>
        <p style={{ margin: '8px 0 16px', fontSize: 13, color: ui.color.textMuted, lineHeight: 1.5 }}>
          Compare segments, browse indicator breakdowns, and map district concentration.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          <DiveCard
            icon={<CompareIcon />}
            title="Comparison tool"
            body="Contrast segments on digital, education, and asset indicators to prioritize products and channels."
            cta="Compare segments"
            onClick={() => onNavigate?.('comparison')}
          />
          <DiveCard
            icon={<OverviewIcon />}
            title="Data browser"
            body="Browse individual data points and segment definitions from this segmentation."
            cta="Browse data"
            onClick={() => onNavigate?.('data-browser')}
          />
          <DiveCard
            icon={<MapIcon />}
            title="Prevalence map"
            body="Discover how population segments are distributed geographically across states and districts."
            cta="View map"
            onClick={() => onNavigate?.('prevalence')}
          />
        </div>
      </section>
    </div>
  );
}
