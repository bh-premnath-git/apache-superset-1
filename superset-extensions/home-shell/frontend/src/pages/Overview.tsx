import * as React from 'react';
import { useMemo, useState } from 'react';
import { ui } from '../theme';
import { api, useFetch } from '../api';
import { ViewKey } from '../nav';
import { CompareIcon, MapIcon, OverviewIcon } from '../icons';

// Pathways-style overview for the Indian Living Conditions Approach (LCA)
// segmentation. The underlying data model defines four rural segments
// (R1–R4, best → most constrained) and three urban segments (U1–U3). We
// re-group those into four vulnerability levels for the hero summary, so
// the page reads like the Northern Nigeria reference design while still
// being faithful to seed/pg/002_lca_segment_views.sql.

type Band = 'Rural' | 'Urban';

interface SegmentDef {
  code: string;
  band: Band;
  label: string;
  rule: string;
  level: 1 | 2 | 3 | 4;
}

const SEGMENT_DEFS: Record<string, SegmentDef> = {
  R1: {
    code: 'R1',
    band: 'Rural',
    label: 'Connected, asset-rich rural',
    rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
    level: 1,
  },
  R2: {
    code: 'R2',
    band: 'Rural',
    label: 'Digitally engaged rural',
    rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not R1)',
    level: 2,
  },
  R3: {
    code: 'R3',
    band: 'Rural',
    label: 'Low-connectivity rural',
    rule: 'digital_score ≤ 1 AND internet_access = 0',
    level: 3,
  },
  R4: {
    code: 'R4',
    band: 'Rural',
    label: 'Most constrained rural',
    rule: 'fallback — none of R1/R2/R3 apply',
    level: 4,
  },
  U1: {
    code: 'U1',
    band: 'Urban',
    label: 'Connected, asset-rich urban',
    rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
    level: 1,
  },
  U2: {
    code: 'U2',
    band: 'Urban',
    label: 'Digitally engaged urban',
    rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not U1)',
    level: 2,
  },
  U3: {
    code: 'U3',
    band: 'Urban',
    label: 'Most constrained urban',
    rule: 'fallback — neither U1 nor U2 applies',
    level: 4,
  },
};

const SEGMENT_ORDER = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'] as const;

const LEVEL_META: Record<1 | 2 | 3 | 4, { name: string; tagColor: string; tagBg: string; chipColor: string }> = {
  4: { name: 'most vulnerable',  tagColor: '#9d174d', tagBg: '#fce7f3', chipColor: '#ec4899' },
  3: { name: 'more vulnerable',  tagColor: '#6b21a8', tagBg: '#f3e8ff', chipColor: '#a855f7' },
  2: { name: 'less vulnerable',  tagColor: '#1e3a8a', tagBg: '#dbeafe', chipColor: '#3b82f6' },
  1: { name: 'least vulnerable', tagColor: '#374151', tagBg: '#e5e7eb', chipColor: '#9ca3af' },
};

type ViewBy = 'level' | 'band' | 'size';

function fmtInt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-IN');
}

function fmtPct(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(0)}%`;
}

function SegmentChip({
  def,
  share,
}: {
  def: SegmentDef;
  share: number | undefined;
}) {
  const meta = LEVEL_META[def.level];
  return (
    <div
      title={`${def.label} — ${def.rule}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 10,
        minWidth: 180,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: meta.chipColor,
          opacity: 0.85,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: 13, color: ui.color.text }}>{def.band}</span>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 4,
          background: meta.tagBg,
          color: meta.tagColor,
        }}
      >
        {def.code}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: ui.color.text, minWidth: 36, textAlign: 'right' }}>
        {fmtPct(share)}
      </span>
      <span aria-hidden style={{ color: ui.color.textMuted, fontSize: 14 }}>→</span>
    </div>
  );
}

function ViewByToggle({ value, onChange }: { value: ViewBy; onChange: (v: ViewBy) => void }) {
  const opts: { key: ViewBy; label: string }[] = [
    { key: 'level', label: 'Vulnerability level' },
    { key: 'band', label: 'Urban / Rural' },
    { key: 'size', label: 'Segment size' },
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
      <span style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: ui.color.chipText }}>{cta} →</span>
    </button>
  );
}

export function OverviewView({ onNavigate }: { onNavigate?: (k: ViewKey) => void } = {}) {
  const summary = useFetch(() => api.summary(), []);
  const segments = useFetch(() => api.segments(), []);

  const [viewBy, setViewBy] = useState<ViewBy>('level');

  const sharesByCode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of segments.data?.segments ?? []) map[row.segment] = row.share_pct;
    return map;
  }, [segments.data]);

  const allDefs = SEGMENT_ORDER.map((c) => SEGMENT_DEFS[c]);

  // Total share within an arbitrary subset, used for the level totals.
  const sumShare = (defs: SegmentDef[]) =>
    defs.reduce((acc, d) => acc + (sharesByCode[d.code] ?? 0), 0);

  const groups: { key: string; tag: string; title: string; total: number; defs: SegmentDef[] }[] = useMemo(() => {
    if (viewBy === 'band') {
      const rural = allDefs.filter((d) => d.band === 'Rural');
      const urban = allDefs.filter((d) => d.band === 'Urban');
      return [
        { key: 'rural', tag: 'R', title: 'Rural households', total: sumShare(rural), defs: rural },
        { key: 'urban', tag: 'U', title: 'Urban households', total: sumShare(urban), defs: urban },
      ];
    }
    if (viewBy === 'size') {
      const sorted = [...allDefs].sort((a, b) => (sharesByCode[b.code] ?? 0) - (sharesByCode[a.code] ?? 0));
      return [{ key: 'size', tag: '#', title: 'Largest to smallest', total: sumShare(sorted), defs: sorted }];
    }
    // level
    return ([4, 3, 2, 1] as const).map((lvl) => {
      const defs = allDefs.filter((d) => d.level === lvl);
      return {
        key: `lvl-${lvl}`,
        tag: String(lvl),
        title: LEVEL_META[lvl].name,
        total: sumShare(defs),
        defs,
      };
    });
  }, [viewBy, sharesByCode]);

  const fetchError = summary.error ?? segments.error;
  const states = summary.data?.states_focus ?? ['Bihar', 'Jharkhand', 'Madhya Pradesh'];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: ui.color.text }}>
          India household segmentation
        </h1>
        <p style={{ margin: '12px 0 0', color: ui.color.chipText, fontSize: 13, lineHeight: 1.6 }}>
          The India segmentation classifies households across focus states using the Living
          Conditions Approach (LCA). Households are split by sector — rural and urban — and then
          grouped into vulnerability-based segments built from digital, asset and connectivity
          signals on <code>household.hh_master</code>. Rural households fall into four segments
          (R1–R4) and urban households into three (U1–U3). R4 and U3 are the two most constrained
          segments: R4 is the largest rural segment in the focus states and U3 covers the urban
          households missing both digital and asset signals. R1 and U1 represent the
          least-constrained ends, where households score on both digital engagement and household
          assets. Segment shares on this page are weighted by the survey weight <code>wt</code>{' '}
          aggregated from <code>vw_state_segment_distribution</code>. Counts come from{' '}
          <code>hh_master</code>; geography from <code>vw_state_district_segment_geo</code>.
          Sonder Collective has taken reasonable steps to assure the accuracy of the data, but
          takes no responsibility for upstream survey accuracy.
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
            Could not load live segmentation data: {fetchError.message}. Showing segment
            definitions only.
          </div>
        )}

        {/* Metadata strip */}
        <div
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
          <MetaCell label="Data source">NSSO HCES (hh_master)</MetaCell>
          <MetaCell label="Sample population">Rural &amp; urban households</MetaCell>
          <MetaCell label="Sample size">
            {summary.loading ? '…' : fmtInt(summary.data?.weighted_households)} weighted hh
          </MetaCell>
          <MetaCell label="Geographic coverage">
            <span>{states.join(', ')}</span>
            <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: ui.color.chipText }}>
              {summary.loading ? '…' : fmtInt(summary.data?.districts_covered)} districts
            </span>
          </MetaCell>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: ui.color.textMuted,
            marginTop: 6,
            padding: '0 2px',
          }}
        >
          <span>Refreshed nightly from PostgreSQL views</span>
          <span>IND_LCA_2024_v1</span>
        </div>
      </section>

      {/* ── Population segments ──────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `2px solid ${ui.color.text}`, paddingTop: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: ui.color.text }}>
            Population segments
          </h2>
          <ViewByToggle value={viewBy} onChange={setViewBy} />
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map((g) => {
            const meta = viewBy === 'level'
              ? LEVEL_META[Number(g.tag) as 1 | 2 | 3 | 4]
              : { tagColor: ui.color.text, tagBg: ui.color.surfaceMuted, chipColor: ui.color.chipText, name: g.title };
            return (
              <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: meta.tagBg,
                      color: meta.tagColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {g.tag}
                  </span>
                  <span style={{ fontSize: 13, color: ui.color.text, fontWeight: 600 }}>{g.title}</span>
                  <span style={{ fontSize: 12, color: ui.color.textMuted }}>
                    · {fmtPct(g.total)} of population
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                  {g.defs.map((d) => (
                    <SegmentChip key={d.code} def={d} share={sharesByCode[d.code]} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 18, fontSize: 12, color: ui.color.chipText, lineHeight: 1.6 }}>
          Letter prefixes (R, U) distinguish rural and urban segments; numeric suffixes (1–4)
          increase with vulnerability. R4 and U3 are the most constrained groups within their
          sector.{' '}
          <a href="#" style={{ color: ui.color.chipText, textDecoration: 'underline' }}>
            Rural/Urban definitions here
          </a>
        </p>
      </section>

      {/* ── Dive deeper ──────────────────────────────────────────────────── */}
      <section>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: ui.color.text, borderTop: `2px solid ${ui.color.text}`, paddingTop: 12 }}>
          Dive deeper into the data
        </h2>
        <p style={{ margin: '8px 0 16px', fontSize: 13, color: ui.color.chipText, lineHeight: 1.5 }}>
          Go beyond the segment shares above with interactive tools that let you compare, map and
          filter the India segmentation data for your specific needs.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          <DiveCard
            icon={<CompareIcon />}
            title="Comparison tool"
            body="Explore patterns across population segments and health areas to inform your work."
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
