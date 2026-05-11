import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ui } from '../theme';
import { api, useFetch, MetricValues, BinaryMetricValues, CategoricalMetricValues } from '../api';
import { ViewKey, SegmentCode, SEGMENT_CODES } from '../nav';
import { Card } from '../components/Card';
import { useCrmState, RATING_STYLE, Rating, DataDimension } from '../crm';

// Screen 3 — Segment Profile.
//
// Deep-dive on one CRM segment. Layout follows the FSP-facing spec:
//   • Hero: code + readiness tier + prevalence
//   • 4 data-dimension panels (Economic / Welfare / Digital / Vulnerability)
//   • Readiness panel (Need / Access / Slack pills)
//   • Product hypothesis (headline + body)
//   • Channel hypothesis (headline + body)
//   • Channel activation ladder (horizontal stepped diagram)
//   • Prev / next segment arrows + "Add to comparison"

const COMPARE_KEY = 'crm.home.comparisonDraft';
const SAVED_KEY = 'crm.home.savedSegments';
const MAX_COMPARE = 3;

function readArr(key: string): SegmentCode[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((s: unknown): s is SegmentCode => typeof s === 'string' && (SEGMENT_CODES as readonly string[]).includes(s))
      : [];
  } catch {
    return [];
  }
}

function writeArr(key: string, arr: SegmentCode[]) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: ui.color.text }}>
        <span>{label}</span>
        <strong>{fmtPct(pct)}</strong>
      </div>
      <div style={{ position: 'relative', height: 8, background: ui.color.surfaceMuted, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${bounded}%`, background: '#60a5fa' }} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
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

function DimensionPanel({
  title,
  blurb,
  metrics,
  metricsByKey,
  loading,
  segmentCode,
}: {
  title: string;
  blurb: string;
  metrics: readonly string[];
  metricsByKey: Map<string, MetricValues>;
  loading: boolean;
  segmentCode: SegmentCode;
}) {
  return (
    <div
      style={{
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <strong style={{ fontSize: 13, color: ui.color.text, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {title}
      </strong>
      <p style={{ margin: '4px 0 12px', fontSize: 11, color: ui.color.textMuted, lineHeight: 1.5 }}>
        {blurb}
      </p>
      {loading && <div style={{ fontSize: 12, color: ui.color.textMuted }}>Loading…</div>}
      {!loading && metrics.map((key) => {
        const m = metricsByKey.get(key);
        if (!m) {
          return (
            <div key={key} style={{ fontSize: 11, color: ui.color.textMuted, marginBottom: 6 }}>
              <em>{key}</em> — not available
            </div>
          );
        }
        if (m.type === 'binary') {
          const bm = m as BinaryMetricValues;
          const v = bm.values.find((x) => x.segment === segmentCode);
          return <BinaryRow key={m.key} label={m.label} pct={v?.share_pct ?? 0} />;
        }
        const cm = m as CategoricalMetricValues;
        const v = cm.values.find((x) => x.segment === segmentCode);
        return (
          <CategoricalRow
            key={m.key}
            label={m.label}
            breakdown={v?.breakdown ?? []}
            categories={cm.categories}
          />
        );
      })}
    </div>
  );
}

function ReadinessPill({ label, rating, note }: { label: string; rating: Rating; note: string }) {
  const style = RATING_STYLE[rating];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 14,
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: ui.color.text, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            background: style.bg,
            color: style.fg,
          }}
        >
          {rating}
        </span>
      </div>
      <span style={{ fontSize: 12, color: ui.color.textMuted, lineHeight: 1.5 }}>{note}</span>
    </div>
  );
}

function ChannelLadder({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <React.Fragment key={`${s}-${i}`}>
          <div
            style={{
              flex: '1 1 0',
              minWidth: 120,
              padding: '12px 14px',
              background: ui.color.surface,
              border: `1px solid ${ui.color.border}`,
              borderRadius: 8,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: ui.color.text,
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: ui.color.chipText,
                marginBottom: 4,
                letterSpacing: 0.4,
              }}
            >
              STEP {i + 1}
            </div>
            {s}
          </div>
          {i < steps.length - 1 && (
            <div
              aria-hidden
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 6px',
                color: ui.color.textMuted,
                fontSize: 18,
              }}
            >
              →
            </div>
          )}
        </React.Fragment>
      ))}
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
  const crmState = useCrmState();
  const crm = crmState.data;
  const brief = crm?.segmentByCode.get(code);
  const dimensions: readonly DataDimension[] = crm?.dimensions ?? [];
  const profileMetricKeys = crm?.allMetricKeys ?? [];

  const summary = useFetch(() => api.summary(), []);
  const segments = useFetch(() => api.segments(), []);
  const mpce = useFetch(() => api.mpce(), []);
  const states = useFetch(() => api.statesSegments(), []);
  const metrics = useFetch(
    () =>
      profileMetricKeys.length
        ? api.metricsValues(profileMetricKeys)
        : Promise.resolve({ states_focus: [], segments: [], metrics: [] as MetricValues[] }),
    [profileMetricKeys.join(',')],
  );

  const [compare, setCompare] = useState<SegmentCode[]>(() => readArr(COMPARE_KEY));
  const [saved, setSaved] = useState<SegmentCode[]>(() => readArr(SAVED_KEY));

  // Re-sync from storage when other tabs change it.
  useEffect(() => {
    const onStorage = () => {
      setCompare(readArr(COMPARE_KEY));
      setSaved(readArr(SAVED_KEY));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
    const band = code.startsWith('R') ? 'Rural' : 'Urban';
    const sectorRows = all.filter((s) => (s.segment.startsWith('R') ? 'Rural' : 'Urban') === band);
    const total = sectorRows.reduce((acc, s) => acc + s.share_pct, 0);
    return total > 0 ? total : undefined;
  }, [segments.data, code]);

  const stateBreakdown = useMemo(() => {
    const out: { state: string; share_pct: number }[] = [];
    for (const st of states.data?.states ?? []) {
      const row = st.segments.find((s) => s.segment === code);
      out.push({ state: st.state, share_pct: row?.share_pct ?? 0 });
    }
    return out;
  }, [states.data, code]);

  const metricsByKey = useMemo(() => {
    const map = new Map<string, MetricValues>();
    for (const m of metrics.data?.metrics ?? []) map.set(m.key, m);
    return map;
  }, [metrics.data]);

  const fetchError =
    summary.error ?? segments.error ?? mpce.error ?? metrics.error ?? crmState.error;

  // Prev / next segment in the canonical R1..U3 order.
  const idx = SEGMENT_CODES.indexOf(code);
  const prevCode = idx > 0 ? SEGMENT_CODES[idx - 1] : SEGMENT_CODES[SEGMENT_CODES.length - 1];
  const nextCode = idx < SEGMENT_CODES.length - 1 ? SEGMENT_CODES[idx + 1] : SEGMENT_CODES[0];

  const inCompare = compare.includes(code);
  const inSaved = saved.includes(code);

  const toggleCompare = () => {
    setCompare((cur) => {
      const next = cur.includes(code)
        ? cur.filter((c) => c !== code)
        : cur.length >= MAX_COMPARE
          ? [...cur.slice(1), code]
          : [...cur, code];
      writeArr(COMPARE_KEY, next);
      return next;
    });
  };

  const toggleSaved = () => {
    setSaved((cur) => {
      const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
      writeArr(SAVED_KEY, next);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            color: ui.color.textMuted,
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate?.('overview')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: ui.color.chipText,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: ui.font,
            }}
          >
            ← All segments
          </button>
          <span>/</span>
          <span>{brief?.tier_label ?? '…'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                background: brief?.tier_badge_bg ?? ui.color.surfaceMuted,
                color: brief?.tier_badge_color ?? ui.color.text,
              }}
            >
              {code}
            </span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: ui.color.text }}>
              {brief?.name ?? code}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => onNavigate?.(`segment:${prevCode}` as ViewKey)}
              title={`Previous segment (${prevCode})`}
              style={navArrowStyle}
            >
              ← {prevCode}
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.(`segment:${nextCode}` as ViewKey)}
              title={`Next segment (${nextCode})`}
              style={navArrowStyle}
            >
              {nextCode} →
            </button>
            <button
              type="button"
              onClick={toggleSaved}
              title={inSaved ? 'Remove bookmark' : 'Bookmark this segment'}
              style={{
                ...navArrowStyle,
                background: inSaved ? ui.color.chip : ui.color.surface,
                color: inSaved ? ui.color.chipText : ui.color.text,
              }}
            >
              {inSaved ? '★ Saved' : '☆ Save'}
            </button>
            <button
              type="button"
              onClick={toggleCompare}
              style={{
                ...navArrowStyle,
                background: inCompare ? ui.color.chipText : ui.color.text,
                color: ui.color.surface,
                border: 'none',
              }}
            >
              {inCompare ? '✓ In compare' : '+ Add to comparison'}
            </button>
          </div>
        </div>

        <p style={{ margin: '10px 0 0', color: ui.color.textMuted, fontSize: 13, lineHeight: 1.6, maxWidth: 820 }}>
          {brief?.overview ?? (crmState.loading ? 'Loading segment brief…' : '')}
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
            Could not load segment data: {fetchError.message}
          </div>
        )}

        {/* KPI strip */}
        <div
          style={{
            marginTop: 18,
            border: `1px solid ${ui.color.border}`,
            borderRadius: 10,
            padding: '14px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 18,
            background: ui.color.surface,
          }}
        >
          <StatCell
            label="Share of focus-state population"
            value={segments.loading ? '…' : fmtPct(seg?.share_pct, 1)}
            sub={sectorTotal != null ? `${fmtPct(sectorTotal, 1)} of HH are ${code.startsWith('R') ? 'Rural' : 'Urban'}` : undefined}
          />
          <StatCell
            label="Weighted households"
            value={segments.loading ? '…' : fmtInt(seg?.weighted_count)}
            sub={`across ${summary.data?.states_focus.join(', ') ?? FOCUS_DEFAULT}`}
          />
          <StatCell
            label="Mean MPCE"
            value={mpce.loading ? '…' : fmtCurrency(mpceRow?.mean_mpce)}
            sub={
              mpceRow?.overall_sector_mean
                ? `${code.startsWith('R') ? 'Rural' : 'Urban'} avg ${fmtCurrency(mpceRow.overall_sector_mean)}`
                : 'monthly per-capita'
            }
          />
          <StatCell
            label="Readiness tier"
            value={brief?.tier_label.replace(/^Tier \d+\s·\s/, '') ?? '…'}
            sub={brief?.tier_tagline}
          />
        </div>
      </section>

      {/* ── State breakdown bar ───────────────────────────────────────── */}
      <Card
        title={`${code} prevalence by state`}
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

      {/* ── 4 data dimension panels ───────────────────────────────────── */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
          }}
        >
          Data dimensions
        </h2>
        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {dimensions.map((d) => (
            <DimensionPanel
              key={d.key}
              title={d.label}
              blurb={d.blurb}
              metrics={d.metrics}
              metricsByKey={metricsByKey}
              loading={metrics.loading}
              segmentCode={code}
            />
          ))}
        </div>
      </section>

      {/* ── Readiness panel ───────────────────────────────────────────── */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
          }}
        >
          Readiness profile
        </h2>
        <p style={{ margin: '6px 0 12px', fontSize: 12, color: ui.color.textMuted }}>
          Need × Access × Slack — the three pillars of CRM readiness for this segment.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {(['need', 'access', 'slack'] as const).map((pillar) => {
            const r = brief?.readiness?.[pillar];
            return (
              <ReadinessPill
                key={pillar}
                label={pillar.charAt(0).toUpperCase() + pillar.slice(1)}
                rating={(r?.rating as Rating) ?? 'Med'}
                note={r?.note ?? (crmState.loading ? 'Loading…' : '—')}
              />
            );
          })}
        </div>
      </section>

      {/* ── Product hypothesis ────────────────────────────────────────── */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
          }}
        >
          Product hypothesis
        </h2>
        <div
          style={{
            marginTop: 10,
            background: ui.color.surface,
            border: `1px solid ${ui.color.border}`,
            borderRadius: 10,
            padding: 16,
          }}
        >
          <strong style={{ fontSize: 14, color: ui.color.text, display: 'block', marginBottom: 6 }}>
            {brief?.product.headline ?? (crmState.loading ? 'Loading…' : '—')}
          </strong>
          <p style={{ margin: 0, fontSize: 13, color: ui.color.textMuted, lineHeight: 1.6 }}>
            {brief?.product.body ?? ''}
          </p>
        </div>
      </section>

      {/* ── Channel hypothesis + activation ladder ───────────────────── */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
          }}
        >
          Channel hypothesis
        </h2>
        <div
          style={{
            marginTop: 10,
            background: ui.color.surface,
            border: `1px solid ${ui.color.border}`,
            borderRadius: 10,
            padding: 16,
          }}
        >
          <strong style={{ fontSize: 14, color: ui.color.text, display: 'block', marginBottom: 6 }}>
            {brief?.channel.headline ?? (crmState.loading ? 'Loading…' : '—')}
          </strong>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: ui.color.textMuted, lineHeight: 1.6 }}>
            {brief?.channel.body ?? ''}
          </p>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: ui.color.textMuted,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Channel activation ladder
          </div>
          <ChannelLadder steps={brief?.channel_ladder ?? []} />
        </div>
      </section>

      {/* ── Cross-links ───────────────────────────────────────────────── */}
      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => onNavigate?.('comparison')} style={linkBtnStyle}>
          Compare to other segments →
        </button>
        <button type="button" onClick={() => onNavigate?.('prevalence')} style={linkBtnStyle}>
          See {code} on the prevalence map →
        </button>
        <button type="button" onClick={() => onNavigate?.('data-browser')} style={linkBtnStyle}>
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

const navArrowStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: `1px solid ${ui.color.border}`,
  borderRadius: 6,
  background: ui.color.surface,
  color: ui.color.text,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: ui.font,
};
