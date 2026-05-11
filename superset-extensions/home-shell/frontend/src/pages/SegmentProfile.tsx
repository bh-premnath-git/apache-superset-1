import * as React from 'react';
import { useMemo } from 'react';
import { ui } from '../theme';
import { api, useFetch, MetricValues, BinaryMetricValues, CategoricalMetricValues } from '../api';
import { ViewKey, SegmentCode } from '../nav';
import { Card } from '../components/Card';

// Per-segment profile, mirroring the "segment profile" sidebar pattern from
// reference Pathways-style dashboards. Reuses the same backend endpoints
// that power Overview and Comparison: /segments (share), /mpce (consumption
// expenditure), and /metrics/values (per-segment indicator breakdowns).

type SegmentDef = {
  code: SegmentCode;
  band: 'Rural' | 'Urban';
  label: string;
  rule: string;
  level: 1 | 2 | 3 | 4;
  blurb: string;
};

const DEFS: Record<SegmentCode, SegmentDef> = {
  R1: { code: 'R1', band: 'Rural', label: 'Connected, asset-rich rural', level: 1,
        rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
        blurb: 'Rural households that score on both digital engagement and household assets — the least-constrained rural group.' },
  R2: { code: 'R2', band: 'Rural', label: 'Digitally engaged rural', level: 2,
        rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not R1)',
        blurb: 'Rural households with mobile phones and digital activity, but without the asset depth of R1.' },
  R3: { code: 'R3', band: 'Rural', label: 'Low-connectivity rural', level: 3,
        rule: 'digital_score ≤ 1 AND internet_access = 0',
        blurb: 'Rural households without internet access and limited digital engagement.' },
  R4: { code: 'R4', band: 'Rural', label: 'Most constrained rural', level: 4,
        rule: 'fallback — none of R1/R2/R3 apply',
        blurb: 'Rural households missing both digital and asset signals — the most constrained rural group, and the largest in the focus states.' },
  U1: { code: 'U1', band: 'Urban', label: 'Connected, asset-rich urban', level: 1,
        rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
        blurb: 'Urban households that score on both digital engagement and household assets.' },
  U2: { code: 'U2', band: 'Urban', label: 'Digitally engaged urban', level: 2,
        rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not U1)',
        blurb: 'Urban households with mobile phones and digital activity, but without the asset depth of U1.' },
  U3: { code: 'U3', band: 'Urban', label: 'Most constrained urban', level: 4,
        rule: 'fallback — neither U1 nor U2 applies',
        blurb: 'Urban households missing both digital and asset signals.' },
};

const LEVEL_META: Record<1 | 2 | 3 | 4, { name: string; tagColor: string; tagBg: string }> = {
  4: { name: 'most vulnerable',  tagColor: '#9d174d', tagBg: '#fce7f3' },
  3: { name: 'more vulnerable',  tagColor: '#6b21a8', tagBg: '#f3e8ff' },
  2: { name: 'less vulnerable',  tagColor: '#1e3a8a', tagBg: '#dbeafe' },
  1: { name: 'least vulnerable', tagColor: '#374151', tagBg: '#e5e7eb' },
};

// Curated indicator set used on the profile. Drawn from METRIC_CATALOG in
// backend/entrypoint.py — keep these keys in sync with the catalog there.
const PROFILE_METRICS = [
  'any_internet',
  'possess_mobile',
  'any_secondary',
  'any_higher',
  'head_edu_level',
  'social_group',
  'dwelling_type',
  'cooking_energy',
  'ration_card',
  'ration_any',
];

function fmtPct(n: number | undefined | null, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

function fmtInt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-IN');
}

function fmtCurrency(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: ui.color.textMuted, letterSpacing: 0.2 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: ui.color.text }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: ui.color.textMuted }}>{sub}</span>}
    </div>
  );
}

function BinaryRow({ label, pct }: { label: string; pct: number }) {
  const bounded = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: ui.color.text }}>
        <span>{label}</span>
        <strong>{fmtPct(pct)}</strong>
      </div>
      <div style={{ position: 'relative', height: 10, background: ui.color.surfaceMuted, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${bounded}%`, background: '#60a5fa',
        }} />
      </div>
    </div>
  );
}

function CategoricalRow({
  label,
  breakdown,
  categories,
}: {
  label: string;
  breakdown: { category: string; share_pct: number }[];
  categories: { key: string; label: string; color: string }[];
}) {
  const byKey: Record<string, number> = {};
  for (const b of breakdown) byKey[b.category] = b.share_pct;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
      <span style={{ fontSize: 12, color: ui.color.text }}>{label}</span>
      <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden' }}>
        {categories.map((c) => {
          const pct = byKey[c.key] ?? 0;
          if (pct <= 0) return null;
          return (
            <div
              key={c.key}
              title={`${c.label} — ${fmtPct(pct, 1)}`}
              style={{ width: `${pct}%`, background: c.color }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: ui.color.textMuted }}>
        {categories.map((c) => (
          <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: 'inline-block' }} />
            {c.label} ({fmtPct(byKey[c.key] ?? 0)})
          </span>
        ))}
      </div>
    </div>
  );
}

export function SegmentProfileView({
  code,
  onNavigate,
}: {
  code: SegmentCode;
  onNavigate?: (k: ViewKey) => void;
}) {
  const def = DEFS[code];
  const meta = LEVEL_META[def.level];

  const summary = useFetch(() => api.summary(), []);
  const segments = useFetch(() => api.segments(), []);
  const mpce = useFetch(() => api.mpce(), []);
  const states = useFetch(() => api.statesSegments(), []);
  const metrics = useFetch(
    () => api.metricsValues(PROFILE_METRICS),
    [],
  );

  const seg = useMemo(
    () => segments.data?.segments.find((s) => s.segment === code),
    [segments.data, code],
  );
  const mpceRow = useMemo(
    () => mpce.data?.segments.find((s) => s.segment === code),
    [mpce.data, code],
  );
  const sectorTotal = useMemo(() => {
    const all = segments.data?.segments ?? [];
    const sectorRows = all.filter((s) => (s.segment.startsWith('R') ? 'Rural' : 'Urban') === def.band);
    const total = sectorRows.reduce((acc, s) => acc + s.share_pct, 0);
    return total > 0 ? total : undefined;
  }, [segments.data, def.band]);

  const stateBreakdown = useMemo(() => {
    const out: { state: string; share_pct: number }[] = [];
    for (const st of states.data?.states ?? []) {
      const row = st.segments.find((s) => s.segment === code);
      out.push({ state: st.state, share_pct: row?.share_pct ?? 0 });
    }
    return out;
  }, [states.data, code]);

  const fetchError = summary.error ?? segments.error ?? mpce.error ?? metrics.error;

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: ui.color.textMuted }}>
          <button
            type="button"
            onClick={() => onNavigate?.('overview')}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              color: ui.color.chipText, fontSize: 12, cursor: 'pointer', fontFamily: ui.font,
            }}
          >
            ← All segments
          </button>
          <span>/</span>
          <span>{def.band}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
          <span
            style={{
              fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
              background: meta.tagBg, color: meta.tagColor,
            }}
          >
            {def.code}
          </span>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: ui.color.text }}>
            {def.band} · {def.label}
          </h1>
        </div>
        <p style={{ margin: '12px 0 0', color: ui.color.chipText, fontSize: 13, lineHeight: 1.6 }}>
          {def.blurb}
        </p>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 12 }}>
          Rule: <code>{def.rule}</code> ·{' '}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
            background: meta.tagBg, color: meta.tagColor,
          }}>
            {meta.name}
          </span>
        </p>

        {fetchError && (
          <div style={{
            marginTop: 14, padding: 12, border: `1px solid ${ui.color.border}`,
            borderRadius: 8, color: '#b00020', fontSize: 12, background: '#fff5f5',
          }}>
            Could not load segment data: {fetchError.message}
          </div>
        )}

        {/* KPI strip */}
        <div style={{
          marginTop: 18, border: `1px solid ${ui.color.border}`, borderRadius: 8,
          padding: '14px 18px', display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18,
          background: ui.color.surface,
        }}>
          <StatCell
            label="Share of focus-state population"
            value={segments.loading ? '…' : fmtPct(seg?.share_pct, 1)}
            sub={sectorTotal != null ? `${fmtPct(sectorTotal, 1)} of HH are ${def.band}` : undefined}
          />
          <StatCell
            label="Weighted households"
            value={segments.loading ? '…' : fmtInt(seg?.weighted_count)}
            sub={`across ${summary.data?.states_focus.join(', ') ?? FOCUS_DEFAULT}`}
          />
          <StatCell
            label="Mean MPCE"
            value={mpce.loading ? '…' : fmtCurrency(mpceRow?.mean_mpce)}
            sub={mpceRow?.overall_sector_mean
              ? `${def.band} avg ${fmtCurrency(mpceRow.overall_sector_mean)}`
              : 'monthly per-capita'}
          />
          <StatCell
            label="MPCE std. dev."
            value={mpce.loading ? '…' : fmtCurrency(mpceRow?.stddev_mpce)}
            sub={mpceRow?.weighted_count
              ? `${fmtInt(mpceRow.weighted_count)} hh in MPCE view`
              : undefined}
          />
        </div>
      </section>

      {/* ── State breakdown ─────────────────────────────────────────────── */}
      <Card
        title={`${def.code} share by state`}
        subtitle="Weighted % of households in this segment within each focus state."
      >
        {states.loading && <div style={{ fontSize: 12, color: ui.color.textMuted }}>Loading…</div>}
        {!states.loading && stateBreakdown.length === 0 && (
          <div style={{ fontSize: 12, color: ui.color.textMuted }}>No data</div>
        )}
        {stateBreakdown.map((s) => (
          <BinaryRow key={s.state} label={s.state} pct={s.share_pct} />
        ))}
      </Card>

      {/* ── Indicator profile ───────────────────────────────────────────── */}
      <Card
        title="Indicator profile"
        subtitle={`Weighted % within ${def.code}. Computed from household.hh_master joined to vw_hh_segments.`}
      >
        {metrics.loading && <div style={{ fontSize: 12, color: ui.color.textMuted }}>Loading indicators…</div>}
        {!metrics.loading && (metrics.data?.metrics ?? []).map((m: MetricValues) => {
          if (m.type === 'binary') {
            const bm = m as BinaryMetricValues;
            const v = bm.values.find((x) => x.segment === code);
            return <BinaryRow key={m.key} label={m.label} pct={v?.share_pct ?? 0} />;
          }
          const cm = m as CategoricalMetricValues;
          const v = cm.values.find((x) => x.segment === code);
          return (
            <CategoricalRow
              key={m.key}
              label={m.label}
              breakdown={v?.breakdown ?? []}
              categories={cm.categories}
            />
          );
        })}
      </Card>

      {/* ── Cross-links ─────────────────────────────────────────────────── */}
      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onNavigate?.('comparison')}
          style={linkBtnStyle}
        >
          Compare to other segments →
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('prevalence')}
          style={linkBtnStyle}
        >
          See {def.code} on the prevalence map →
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('data-browser')}
          style={linkBtnStyle}
        >
          Browse all indicators →
        </button>
      </section>
    </div>
  );
}

const FOCUS_DEFAULT = 'Bihar, Jharkhand, Madhya Pradesh';

const linkBtnStyle: React.CSSProperties = {
  background: ui.color.surface,
  border: `1px solid ${ui.color.border}`,
  borderRadius: 8,
  padding: '10px 14px',
  fontFamily: ui.font,
  fontSize: 13,
  fontWeight: 600,
  color: ui.color.chipText,
  cursor: 'pointer',
};
