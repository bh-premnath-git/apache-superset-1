import * as React from 'react';
import { useMemo, useState } from 'react';
import { ui } from '../theme';
import { api, useFetch } from '../api';
import { ViewKey, SegmentCode, SEGMENT_CODES } from '../nav';
import { CompareIcon, MapIcon, OverviewIcon, RuralIcon, UrbanIcon } from '../icons';
import { SEGMENT_BRIEF, TIER_META, TIER_ORDER, Tier } from '../crm';

// Screen 2 — Segment Overview.
//
// All 7 CRM segments at a glance, grouped by readiness tier (default) or by
// sector / size. Each card shows the segment code, FSP-facing name, the
// readiness tier badge, the overall prevalence %, and a per-state mini bar.

type Band = 'Rural' | 'Urban';
type ViewBy = 'tier' | 'band' | 'size';

function fmtInt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-IN');
}

function fmtPct(n: number | undefined | null, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

function bandOf(code: SegmentCode): Band {
  return code.startsWith('R') ? 'Rural' : 'Urban';
}

// Lightweight tooltip rendered absolutely over the card on hover.
function HoverTooltip({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        bottom: -10,
        left: 12,
        right: 12,
        transform: 'translateY(100%)',
        background: ui.color.text,
        color: ui.color.surface,
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 11,
        lineHeight: 1.5,
        boxShadow: '0 6px 18px rgba(15,23,42,0.25)',
        zIndex: 10,
      }}
    >
      {children}
    </div>
  );
}

function StateMiniBar({
  states,
}: {
  states: { state: string; share_pct: number }[];
}) {
  const max = Math.max(1, ...states.map((s) => s.share_pct));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {states.map((s) => (
        <div
          key={s.state}
          style={{
            display: 'grid',
            gridTemplateColumns: '46px 1fr 36px',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 10, color: ui.color.textMuted, fontWeight: 600, letterSpacing: 0.2 }}>
            {s.state.slice(0, 3).toUpperCase()}
          </span>
          <div
            style={{
              position: 'relative',
              height: 6,
              background: ui.color.surfaceMuted,
              borderRadius: 2,
            }}
          >
            <div
              style={{
                width: `${(s.share_pct / max) * 100}%`,
                height: '100%',
                background: ui.color.chipText,
                borderRadius: 2,
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: ui.color.text, textAlign: 'right' }}>
            {fmtPct(s.share_pct)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SegmentCard({
  code,
  share,
  states,
  onOpen,
  onAddToCompare,
  hoverStats,
  inCompare,
}: {
  code: SegmentCode;
  share: number | undefined;
  states: { state: string; share_pct: number }[];
  onOpen: () => void;
  onAddToCompare: () => void;
  hoverStats: { mpce: string; internet: string; ration: string } | null;
  inCompare: boolean;
}) {
  const brief = SEGMENT_BRIEF[code];
  const tier = TIER_META[brief.tier];
  const isRural = bandOf(code) === 'Rural';
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: ui.color.surfaceMuted,
              color: ui.color.text,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isRural ? <RuralIcon /> : <UrbanIcon />}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 6,
              background: tier.badgeBg,
              color: tier.badgeColor,
            }}
          >
            {code}
          </span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: ui.color.text }}>
          {fmtPct(share, 1)}
        </span>
      </div>

      <div>
        <strong style={{ fontSize: 13, color: ui.color.text, lineHeight: 1.4, display: 'block' }}>
          {brief.name}
        </strong>
        <span
          style={{
            fontSize: 11,
            color: tier.badgeColor,
            fontWeight: 600,
            display: 'inline-block',
            marginTop: 4,
          }}
        >
          {tier.label}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: ui.color.textMuted, lineHeight: 1.5 }}>
        {brief.persona}
      </p>

      <div style={{ borderTop: `1px solid ${ui.color.border}`, paddingTop: 10 }}>
        <span style={{ fontSize: 10, color: ui.color.textMuted, fontWeight: 600, letterSpacing: 0.4 }}>
          STATE PREVALENCE
        </span>
        <div style={{ marginTop: 6 }}>
          <StateMiniBar states={states} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button
          type="button"
          onClick={onOpen}
          style={{
            flex: 1,
            padding: '7px 10px',
            border: 'none',
            borderRadius: 6,
            background: ui.color.text,
            color: ui.color.surface,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: ui.font,
          }}
        >
          Open profile →
        </button>
        <button
          type="button"
          onClick={onAddToCompare}
          title={inCompare ? 'Already in comparison' : 'Add to comparison'}
          style={{
            padding: '7px 10px',
            border: `1px solid ${ui.color.border}`,
            borderRadius: 6,
            background: inCompare ? ui.color.chip : ui.color.surface,
            color: inCompare ? ui.color.chipText : ui.color.text,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: ui.font,
          }}
        >
          {inCompare ? '✓ Compare' : '+ Compare'}
        </button>
      </div>

      {hover && hoverStats && (
        <HoverTooltip>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ opacity: 0.7 }}>MPCE</div>
              <div style={{ fontWeight: 700 }}>{hoverStats.mpce}</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Internet</div>
              <div style={{ fontWeight: 700 }}>{hoverStats.internet}</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Ration</div>
              <div style={{ fontWeight: 700 }}>{hoverStats.ration}</div>
            </div>
          </div>
        </HoverTooltip>
      )}
    </div>
  );
}

function ViewByToggle({ value, onChange }: { value: ViewBy; onChange: (v: ViewBy) => void }) {
  const opts: { key: ViewBy; label: string }[] = [
    { key: 'tier', label: 'By readiness tier' },
    { key: 'band', label: 'Rural / Urban' },
    { key: 'size', label: 'By prevalence' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
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
                color: active ? ui.color.text : ui.color.chipText,
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
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
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
      <strong style={{ fontSize: 14, color: ui.color.text }}>{title}</strong>
      <p style={{ margin: 0, fontSize: 12, color: ui.color.textMuted, lineHeight: 1.5 }}>{body}</p>
      <span style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: ui.color.chipText }}>{cta} →</span>
    </button>
  );
}

const COMPARE_KEY = 'crm.home.comparisonDraft';
const MAX_COMPARE = 3;

function readCompareDraft(): SegmentCode[] {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s: unknown): s is SegmentCode => typeof s === 'string' && (SEGMENT_CODES as readonly string[]).includes(s)) : [];
  } catch {
    return [];
  }
}

function writeCompareDraft(arr: SegmentCode[]) {
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export function OverviewView({ onNavigate }: { onNavigate?: (k: ViewKey) => void } = {}) {
  const summary = useFetch(() => api.summary(), []);
  const segments = useFetch(() => api.segments(), []);
  const states = useFetch(() => api.statesSegments(), []);
  const mpce = useFetch(() => api.mpce(), []);
  const indicators = useFetch(() => api.metricsValues(['any_internet', 'ration_any']), []);

  const [viewBy, setViewBy] = useState<ViewBy>('tier');
  const [compare, setCompare] = useState<SegmentCode[]>(() => readCompareDraft());

  const sharesByCode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of segments.data?.segments ?? []) map[row.segment] = row.share_pct;
    return map;
  }, [segments.data]);

  const stateBreakdownByCode = useMemo(() => {
    const map: Record<string, { state: string; share_pct: number }[]> = {};
    for (const code of SEGMENT_CODES) map[code] = [];
    for (const st of states.data?.states ?? []) {
      for (const seg of st.segments) {
        if (!(SEGMENT_CODES as readonly string[]).includes(seg.segment)) continue;
        map[seg.segment].push({ state: st.state, share_pct: seg.share_pct });
      }
    }
    return map;
  }, [states.data]);

  const hoverStatsByCode = useMemo(() => {
    const out: Record<string, { mpce: string; internet: string; ration: string }> = {};
    const mpceBySeg = new Map<string, number>();
    for (const r of mpce.data?.segments ?? []) mpceBySeg.set(r.segment, r.mean_mpce);
    const internetBySeg = new Map<string, number>();
    const rationBySeg = new Map<string, number>();
    for (const m of indicators.data?.metrics ?? []) {
      if (m.type !== 'binary') continue;
      const target = m.key === 'any_internet' ? internetBySeg : m.key === 'ration_any' ? rationBySeg : null;
      if (!target) continue;
      for (const v of m.values) target.set(v.segment, v.share_pct);
    }
    for (const code of SEGMENT_CODES) {
      const mp = mpceBySeg.get(code);
      out[code] = {
        mpce: mp == null ? '—' : `₹${Math.round(mp).toLocaleString('en-IN')}`,
        internet: fmtPct(internetBySeg.get(code) ?? null),
        ration: fmtPct(rationBySeg.get(code) ?? null),
      };
    }
    return out;
  }, [mpce.data, indicators.data]);

  const sumShare = (codes: SegmentCode[]) =>
    codes.reduce((acc, c) => acc + (sharesByCode[c] ?? 0), 0);

  const groups: { key: string; tag: string; title: string; subtitle?: string; total: number; codes: SegmentCode[]; tierMeta?: typeof TIER_META[Tier] }[] = useMemo(() => {
    if (viewBy === 'band') {
      const rural = SEGMENT_CODES.filter((c) => bandOf(c) === 'Rural');
      const urban = SEGMENT_CODES.filter((c) => bandOf(c) === 'Urban');
      return [
        { key: 'rural', tag: 'R', title: 'Rural households', total: sumShare([...rural]), codes: [...rural] },
        { key: 'urban', tag: 'U', title: 'Urban households', total: sumShare([...urban]), codes: [...urban] },
      ];
    }
    if (viewBy === 'size') {
      const sorted = [...SEGMENT_CODES].sort((a, b) => (sharesByCode[b] ?? 0) - (sharesByCode[a] ?? 0));
      return [{ key: 'size', tag: '#', title: 'Largest to smallest', total: sumShare(sorted), codes: sorted }];
    }
    return TIER_ORDER.map((t) => {
      const meta = TIER_META[t];
      return {
        key: `tier-${t}`,
        tag: String(t),
        title: meta.label,
        subtitle: meta.tagline,
        total: sumShare(meta.members),
        codes: meta.members,
        tierMeta: meta,
      };
    });
  }, [viewBy, sharesByCode]);

  const fetchError = summary.error ?? segments.error;
  const focusStates = summary.data?.states_focus ?? ['Bihar', 'Madhya Pradesh', 'Jharkhand'];

  const toggleCompare = (code: SegmentCode) => {
    setCompare((cur) => {
      const next = cur.includes(code)
        ? cur.filter((c) => c !== code)
        : cur.length >= MAX_COMPARE
          ? [...cur.slice(1), code]
          : [...cur, code];
      writeCompareDraft(next);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: ui.color.text }}>
          CRM Population Segments — {focusStates.join(', ')}
        </h1>
        <p style={{ margin: '10px 0 0', color: ui.color.textMuted, fontSize: 13, lineHeight: 1.6, maxWidth: 760 }}>
          Seven segments cluster into four readiness tiers based on FSP entry strategy. Pick the
          tier that matches your product hypothesis, then drill into a segment for the persona,
          data dimensions and channel ladder.
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
            Could not load live segmentation data: {fetchError.message}.
          </div>
        )}

        {/* Methodology strip */}
        <div
          style={{
            marginTop: 16,
            border: `1px solid ${ui.color.border}`,
            borderRadius: 8,
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 16,
            background: ui.color.surface,
          }}
        >
          <MetaCell label="Data source">NSSO HCES 2023-24</MetaCell>
          <MetaCell label="Sample">
            {summary.loading ? '…' : fmtInt(summary.data?.weighted_households)} weighted hh
          </MetaCell>
          <MetaCell label="Method">LCA · 4-class structural</MetaCell>
          <MetaCell label="Geography">
            {focusStates.join(', ')}
            <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: ui.color.textMuted }}>
              {summary.loading ? '…' : fmtInt(summary.data?.districts_covered)} districts
            </span>
          </MetaCell>
        </div>
      </section>

      {/* ── Compare tray ───────────────────────────────────────────────── */}
      {compare.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: ui.color.chip,
            border: `1px solid ${ui.color.border}`,
            borderRadius: 8,
            color: ui.color.chipText,
            fontSize: 13,
          }}
        >
          <strong>Compare ({compare.length}/{MAX_COMPARE}):</strong>
          {compare.map((c) => (
            <span
              key={c}
              style={{
                padding: '2px 8px',
                background: ui.color.surface,
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {c}
            </span>
          ))}
          <button
            type="button"
            onClick={() => onNavigate?.('comparison')}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              border: 'none',
              borderRadius: 6,
              background: ui.color.chipText,
              color: ui.color.surface,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: ui.font,
            }}
          >
            Open comparison →
          </button>
          <button
            type="button"
            onClick={() => {
              setCompare([]);
              writeCompareDraft([]);
            }}
            style={{
              padding: '6px 10px',
              border: `1px solid ${ui.color.chipText}`,
              borderRadius: 6,
              background: 'transparent',
              color: ui.color.chipText,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: ui.font,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Segments ───────────────────────────────────────────────────── */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: ui.color.text }}>
            Population segments
          </h2>
          <ViewByToggle value={viewBy} onChange={setViewBy} />
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {groups.map((g) => (
            <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    padding: '0 6px',
                    borderRadius: '50%',
                    background: g.tierMeta?.badgeBg ?? ui.color.surfaceMuted,
                    color: g.tierMeta?.badgeColor ?? ui.color.text,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {g.tag}
                </span>
                <span style={{ fontSize: 14, color: ui.color.text, fontWeight: 700 }}>
                  {g.title}
                </span>
                <span style={{ fontSize: 12, color: ui.color.textMuted }}>
                  · {fmtPct(g.total, 1)} of population
                </span>
                {g.subtitle && (
                  <span style={{ fontSize: 12, color: ui.color.textMuted, lineHeight: 1.4, flexBasis: '100%' }}>
                    {g.subtitle}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 12,
                }}
              >
                {g.codes.map((c) => (
                  <SegmentCard
                    key={c}
                    code={c}
                    share={sharesByCode[c]}
                    states={stateBreakdownByCode[c] ?? []}
                    onOpen={() => onNavigate?.(`segment:${c}` as ViewKey)}
                    onAddToCompare={() => toggleCompare(c)}
                    hoverStats={hoverStatsByCode[c] ?? null}
                    inCompare={compare.includes(c)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Methodology summary ────────────────────────────────────────── */}
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
        <strong style={{ color: ui.color.text }}>Methodology summary</strong>
        <br />
        Source: NSSO HCES 2023-24, restricted to Bihar, MP and Jharkhand. Method: 4-class LCA
        on digital, asset, welfare and demographic signals from
        <code> household.hh_master</code>. Sample: {summary.loading ? '…' : fmtInt(summary.data?.weighted_households)}{' '}
        weighted households across {summary.loading ? '…' : fmtInt(summary.data?.districts_covered)} districts.
        Limitations: M1 captures structural readiness only — behavioural (M2) and outcome (M3)
        layers are deferred. SBC Labs takes no responsibility for upstream survey accuracy.
      </section>

      {/* ── Dive deeper ────────────────────────────────────────────────── */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
          }}
        >
          Dive deeper
        </h2>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <DiveCard
            icon={<CompareIcon />}
            title="Comparison tool"
            body="Compare any 2–3 segments side-by-side across data dimensions, readiness and channel."
            cta="Compare segments"
            onClick={() => onNavigate?.('comparison')}
          />
          <DiveCard
            icon={<OverviewIcon />}
            title="Data browser"
            body="Browse every indicator by segment, with a search and per-category filter."
            cta="Browse data"
            onClick={() => onNavigate?.('data-browser')}
          />
          <DiveCard
            icon={<MapIcon />}
            title="Prevalence map"
            body="See the district-level concentration of any segment across the three focus states."
            cta="View map"
            onClick={() => onNavigate?.('prevalence')}
          />
        </div>
      </section>
    </div>
  );
}
