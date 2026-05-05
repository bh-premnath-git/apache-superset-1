import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
// Superset 6.x ships React 17 as its host runtime and only shares the base
// `react-dom` module via Module Federation (not the `react-dom/client`
// subpath). Use the legacy ReactDOM.render API.
import * as ReactDOM from 'react-dom';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// ── Routing ──────────────────────────────────────────────────────────────────
// Superset's welcome page is mounted at /superset/welcome/. Some deployments
// also redirect bare "/" to it. We render on either.
const WELCOME_PATHS = ['/superset/welcome/', '/superset/welcome', '/'];

function isWelcomeRoute(pathname: string): boolean {
  return WELCOME_PATHS.some(
    (p) => pathname === p || pathname.replace(/\/$/, '') === p.replace(/\/$/, ''),
  );
}

// ── Theme ────────────────────────────────────────────────────────────────────
const ui = {
  color: {
    sidebar: '#0f172a',
    sidebarText: '#e2e8f0',
    sidebarTextMuted: '#94a3b8',
    sidebarActive: '#1e293b',
    accent: '#22c55e',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#6b7280',
    chip: '#eff6ff',
    chipText: '#1d4ed8',
  },
  font:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

// Top offset reserves space for Superset's nav bar (~58px in v6).
const NAV_HEIGHT = 60;
const SIDEBAR_WIDTH = 260;

// ── Dummy data ───────────────────────────────────────────────────────────────
type SegmentRow = { segment: string; share: number; mpce: number };

const SEGMENTS: SegmentRow[] = [
  { segment: 'Aspirers',         share: 32.4, mpce: 1850 },
  { segment: 'Strivers',         share: 24.1, mpce: 2640 },
  { segment: 'Comfortable',      share: 18.7, mpce: 3920 },
  { segment: 'Affluent',         share:  9.2, mpce: 6810 },
  { segment: 'Subsisters',       share: 15.6, mpce: 1120 },
];

const STATES = [
  'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu', 'Karnataka',
  'West Bengal', 'Gujarat', 'Rajasthan', 'Madhya Pradesh',
  'Bihar', 'Andhra Pradesh', 'Telangana', 'Kerala',
];

// Deterministic pseudo-random so colors are stable on re-render.
function hashShare(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h % 100);
}

// ── Navigation ───────────────────────────────────────────────────────────────
type ViewKey =
  | 'overview'
  | 'comparison'
  | 'prevalence'
  | 'coverage'
  | 'entry-points'
  | 'navigation'
  | 'compare-curate'
  | 'viz-roadmap';

type NavItem = { key: ViewKey; label: string; icon: React.ReactNode };
type NavSection = { heading: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Dashboard',
    items: [
      { key: 'overview',   label: 'Overview',         icon: <OverviewIcon /> },
      { key: 'comparison', label: 'Comparison tool',  icon: <CompareIcon /> },
      { key: 'prevalence', label: 'Prevalence map',   icon: <MapIcon /> },
    ],
  },
  {
    heading: 'Roadmap & context',
    items: [
      { key: 'coverage',       label: 'Coverage & status',     icon: <StatusIcon /> },
      { key: 'entry-points',   label: 'Entry points',          icon: <DoorIcon /> },
      { key: 'navigation',     label: 'Navigation pathways',   icon: <PathIcon /> },
      { key: 'compare-curate', label: 'Compare & curate',      icon: <LayersIcon /> },
      { key: 'viz-roadmap',    label: 'Visualization roadmap', icon: <ChartIcon /> },
    ],
  },
];

// ── Icons ────────────────────────────────────────────────────────────────────
function OverviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}
function CompareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h7v12H3z" />
      <path d="M14 6h7v12h-7z" />
      <path d="M10 12h4" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2z" />
      <path d="M9 3v16" />
      <path d="M15 5v16" />
    </svg>
  );
}
function StatusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function DoorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M4 21h16" />
      <circle cx="14" cy="13" r="0.6" fill="currentColor" />
    </svg>
  );
}
function PathIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 6h6a4 4 0 0 1 4 4v6" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5 9-5z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, onSelect }: {
  active: ViewKey;
  onSelect: (k: ViewKey) => void;
}) {
  return (
    <aside style={{
      width: SIDEBAR_WIDTH,
      background: ui.color.sidebar,
      color: ui.color.sidebarText,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      borderRight: `1px solid ${ui.color.border}`,
    }}>
      <div style={{ padding: '0 20px 16px', fontSize: 13, color: ui.color.sidebarTextMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
        India Segmentation
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.heading} style={{ marginTop: sIdx === 0 ? 0 : 14 }}>
            <div style={{
              padding: '6px 20px',
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: ui.color.sidebarTextMuted,
              opacity: 0.7,
            }}>
              {section.heading}
            </div>
            {section.items.map((item) => {
              const isActive = item.key === active;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 20px',
                    background: isActive ? ui.color.sidebarActive : 'transparent',
                    color: ui.color.sidebarText,
                    border: 'none',
                    borderLeft: `3px solid ${isActive ? ui.color.accent : 'transparent'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: ui.font,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    width: '100%',
                  }}
                >
                  <span style={{ display: 'inline-flex', opacity: isActive ? 1 : 0.7 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '16px 20px', fontSize: 11, color: ui.color.sidebarTextMuted, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
        Dummy data preview · v0.1.0
      </div>
    </aside>
  );
}

// ── Card primitives ──────────────────────────────────────────────────────────
function Card({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{
      background: ui.color.surface,
      border: `1px solid ${ui.color.border}`,
      borderRadius: 10,
      padding: 18,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <header style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ui.color.text }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: ui.color.textMuted }}>
            {subtitle}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{
      background: ui.color.surface,
      border: `1px solid ${ui.color.border}`,
      borderRadius: 10,
      padding: 16,
    }}>
      <div style={{ fontSize: 12, color: ui.color.textMuted }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: ui.color.text, marginTop: 4 }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: ui.color.textMuted, marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}

// ── Bar (CSS-only) ───────────────────────────────────────────────────────────
function SegmentBars({ rows, palette }: { rows: SegmentRow[]; palette: string[] }) {
  const max = Math.max(...rows.map((r) => r.share));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={r.segment} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 56px', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <div style={{ color: ui.color.text, fontWeight: 500 }}>{r.segment}</div>
          <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${(r.share / max) * 100}%`,
              height: '100%',
              background: palette[i % palette.length],
              borderRadius: 4,
            }} />
          </div>
          <div style={{ textAlign: 'right', color: ui.color.textMuted }}>{r.share.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
          India Household Segmentation — Overview
        </h1>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>
          Five-segment latent-class model on household consumption (NSSO HCES). Dummy data shown.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        <Kpi label="Households (sampled)" value="261,746" hint="LCA training set" />
        <Kpi label="States covered" value="36" hint="States + UTs" />
        <Kpi label="Districts covered" value="707" hint="Census 2011 boundaries" />
        <Kpi label="Segments" value="5" hint="Subsisters → Affluent" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card title="Segment distribution" subtitle="Share of households by segment, all-India">
          <SegmentBars
            rows={SEGMENTS}
            palette={['#1d4ed8', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444']}
          />
        </Card>
        <Card title="Median MPCE" subtitle="Monthly per-capita expenditure (₹)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SEGMENTS.map((s) => (
              <div key={s.segment} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{s.segment}</span>
                <strong>₹{s.mpce.toLocaleString('en-IN')}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Comparison tool ──────────────────────────────────────────────────────────
function ComparisonPicker({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: ui.color.textMuted }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 10px',
          fontSize: 13,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 6,
          background: ui.color.surface,
          color: ui.color.text,
        }}
      >
        {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );
}

function ComparisonView() {
  const [left, setLeft] = useState('Maharashtra');
  const [right, setRight] = useState('Tamil Nadu');

  const leftRows = useMemo(
    () => SEGMENTS.map((s) => ({ ...s, share: +(s.share + (hashShare(left + s.segment) - 50) * 0.2).toFixed(1) })),
    [left],
  );
  const rightRows = useMemo(
    () => SEGMENTS.map((s) => ({ ...s, share: +(s.share + (hashShare(right + s.segment) - 50) * 0.2).toFixed(1) })),
    [right],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
          Comparison tool
        </h1>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>
          Side-by-side segment composition for two states. Dummy data shown.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title={left}>
          <ComparisonPicker label="State A" value={left} onChange={setLeft} />
          <div style={{ height: 14 }} />
          <SegmentBars rows={leftRows} palette={['#1d4ed8', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444']} />
        </Card>
        <Card title={right}>
          <ComparisonPicker label="State B" value={right} onChange={setRight} />
          <div style={{ height: 14 }} />
          <SegmentBars rows={rightRows} palette={['#1d4ed8', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444']} />
        </Card>
      </div>

      <Card title="Difference (A − B)" subtitle="Percentage-point gap by segment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leftRows.map((row, i) => {
            const diff = +(row.share - rightRows[i].share).toFixed(1);
            const positive = diff >= 0;
            return (
              <div key={row.segment} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px', alignItems: 'center', gap: 12, fontSize: 13 }}>
                <span>{row.segment}</span>
                <div style={{ position: 'relative', height: 6, background: ui.color.surfaceMuted, borderRadius: 3 }}>
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    width: `${Math.min(Math.abs(diff) * 4, 50)}%`,
                    height: '100%',
                    background: positive ? '#22c55e' : '#ef4444',
                    borderRadius: 3,
                    transform: positive ? 'translateX(0)' : 'translateX(-100%)',
                  }} />
                </div>
                <span style={{ textAlign: 'right', color: positive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {positive ? '+' : ''}{diff} pp
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Prevalence map ───────────────────────────────────────────────────────────
type Granularity = 'state' | 'district';

function PrevalenceMapView() {
  const [granularity, setGranularity] = useState<Granularity>('state');
  const [segment, setSegment] = useState('Aspirers');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
          Prevalence map
        </h1>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>
          Choropleth of segment share across India. Toggle state vs district granularity.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex',
          background: ui.color.surface,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 999,
          padding: 3,
        }}>
          {(['state', 'district'] as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                background: granularity === g ? ui.color.text : 'transparent',
                color: granularity === g ? '#fff' : ui.color.textMuted,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {g}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: ui.color.textMuted }}>
          Segment
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            style={{
              padding: '6px 10px', fontSize: 13, border: `1px solid ${ui.color.border}`,
              borderRadius: 6, background: ui.color.surface, color: ui.color.text,
            }}
          >
            {SEGMENTS.map((s) => <option key={s.segment} value={s.segment}>{s.segment}</option>)}
          </select>
        </label>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: ui.color.textMuted }}>
          Dummy data — district-level wiring uses <code>india-districts.geojson</code>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card title={`India — ${segment} share by ${granularity}`}>
          <MapPlaceholder granularity={granularity} segment={segment} />
        </Card>

        <Card title="Top regions" subtitle={`Highest ${segment} share`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {STATES.slice(0, 8).map((name) => {
              const score = (hashShare(name + segment + granularity) % 35) + 10;
              return (
                <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 50px', alignItems: 'center', gap: 8 }}>
                  <span>{name}</span>
                  <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${(score / 45) * 100}%`, height: '100%', background: '#1d4ed8', borderRadius: 4 }} />
                  </div>
                  <span style={{ textAlign: 'right', color: ui.color.textMuted }}>{score}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MapPlaceholder({ granularity, segment }: { granularity: Granularity; segment: string }) {
  // Lightweight SVG placeholder. Production wiring will load india-districts.geojson
  // (already in the repo root) and render a proper choropleth via d3-geo.
  const cells = granularity === 'state' ? 36 : 144;
  const cols = granularity === 'state' ? 6 : 12;
  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 4,
        background: ui.color.surfaceMuted,
        padding: 10,
        borderRadius: 8,
      }}>
        {Array.from({ length: cells }).map((_, i) => {
          const intensity = (hashShare(`${segment}-${granularity}-${i}`) % 90) + 10;
          return (
            <div key={i} style={{
              aspectRatio: '1 / 1',
              background: `rgba(29, 78, 216, ${intensity / 100})`,
              borderRadius: 2,
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11, color: ui.color.textMuted }}>
        <span>Low</span>
        <div style={{
          flex: 1, height: 6, borderRadius: 3,
          background: 'linear-gradient(90deg, rgba(29,78,216,0.1), rgba(29,78,216,1))',
        }} />
        <span>High</span>
      </div>
    </div>
  );
}

// ── Roadmap primitives ───────────────────────────────────────────────────────
type StatusKind = 'live' | 'in-progress' | 'planned' | 'caveat';

const STATUS_STYLE: Record<StatusKind, { bg: string; fg: string; label: string }> = {
  live:          { bg: '#dcfce7', fg: '#166534', label: 'Live' },
  'in-progress': { bg: '#fef3c7', fg: '#92400e', label: 'In progress' },
  planned:       { bg: '#e0e7ff', fg: '#3730a3', label: 'Planned' },
  caveat:        { bg: '#fee2e2', fg: '#991b1b', label: 'Caveat' },
};

function StatusPill({ kind }: { kind: StatusKind }) {
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

function PageHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
        {title}
      </h1>
      <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>{lede}</p>
    </div>
  );
}

function NoteList({
  items,
}: { items: { kind: StatusKind; title: string; body: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr',
          gap: 14,
          padding: '12px 14px',
          background: ui.color.surface,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 8,
        }}>
          <div><StatusPill kind={it.kind} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ui.color.text }}>{it.title}</div>
            <div style={{ fontSize: 12, color: ui.color.textMuted, marginTop: 4, lineHeight: 1.5 }}>
              {it.body}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Coverage & status ────────────────────────────────────────────────────────
function CoverageView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Coverage & status"
        lede="Where the dashboard stands today: scope of validated analysis, data caveats, and active fixes."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <Kpi label="Validated states" value="3" hint="Bihar · Jharkhand · Madhya Pradesh" />
        <Kpi label="Underlying coverage" value="All-India" hint="Methodology not yet validated outside the 3 states" />
        <Kpi label="Segmentation type" value="Composite" hint="Across the 3 states, not per-state" />
      </div>

      <Card title="Validated scope" subtitle="What the current segmentation actually covers">
        <NoteList items={[
          { kind: 'live',    title: 'Three-state composite segmentation',
            body: 'Bihar, Jharkhand and Madhya Pradesh are the only states whose segmentation has been methodologically validated.' },
          { kind: 'caveat',  title: 'Underlying data exists for all of India',
            body: 'Raw inputs cover every state, but applying the current model outside the validated three is not supported yet.' },
          { kind: 'caveat',  title: 'Composite, not state-level',
            body: 'Segments are derived across the three states together; the dashboard does not yet expose a per-state model.' },
        ]} />
      </Card>

      <Card title="Active fixes" subtitle="Visualization issues being corrected">
        <NoteList items={[
          { kind: 'in-progress', title: 'Pie chart sizing',
            body: 'Pies render too small; resizing pass underway so segment slices are legible without zooming.' },
          { kind: 'in-progress', title: 'Icon and literal display',
            body: 'A few icons and string literals are rendering incorrectly; cleanup in progress.' },
          { kind: 'in-progress', title: 'Larger circle visualizations',
            body: 'Bumping circle/marker sizes so the prevalence layer is readable at typical screen widths.' },
          { kind: 'in-progress', title: 'Interactive features',
            body: 'Drill, hover, and selection behaviours are being wired up across the existing charts.' },
        ]} />
      </Card>
    </div>
  );
}

// ── Entry points ─────────────────────────────────────────────────────────────
function EntryPointsView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Entry points"
        lede="Set context before showing insights. First-time users should land on facts, not conclusions."
      />

      <Card title="What a first-time user should see first">
        <NoteList items={[
          { kind: 'planned', title: 'Base data sources',
            body: 'Name the underlying surveys/datasets that feed the model so users know what they are looking at.' },
          { kind: 'planned', title: 'Collection timeline',
            body: 'When the data was collected and over what period — required to read prevalence numbers correctly.' },
          { kind: 'planned', title: 'Methodology summary',
            body: 'How segments are derived (latent-class on consumption) in plain language, before any chart appears.' },
          { kind: 'planned', title: 'Facts before insights',
            body: 'Lead with descriptive numbers (households, districts, segments). Save interpretation for later screens.' },
        ]} />
      </Card>

      <Card title="Why this matters" subtitle="Avoiding misreads">
        <p style={{ margin: 0, fontSize: 13, color: ui.color.textMuted, lineHeight: 1.6 }}>
          Users currently land on a map without knowing what is being measured, when, or for which states the model is
          validated. The entry-point work fixes that by treating the first screen as orientation, not analytics.
        </p>
      </Card>
    </div>
  );
}

// ── Navigation pathways ──────────────────────────────────────────────────────
function NavigationView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Navigation pathways"
        lede="Multiple ways into the data, so users can start from the question they actually have."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <Card title="Geography-first">
          <StatusPill kind="live" />
          <p style={{ margin: '10px 0 0', fontSize: 13, color: ui.color.textMuted, lineHeight: 1.5 }}>
            The current map view. Pick a place, then see its segment composition.
          </p>
        </Card>
        <Card title="Segment-first">
          <StatusPill kind="planned" />
          <p style={{ margin: '10px 0 0', fontSize: 13, color: ui.color.textMuted, lineHeight: 1.5 }}>
            Pick a segment (e.g. Aspirers), then see where it's most prevalent across districts.
          </p>
        </Card>
        <Card title="Urban / rural toggle">
          <StatusPill kind="planned" />
          <p style={{ margin: '10px 0 0', fontSize: 13, color: ui.color.textMuted, lineHeight: 1.5 }}>
            A single switch that re-scopes every chart between urban-only, rural-only, and combined.
          </p>
        </Card>
      </div>

      <Card title="Design intent">
        <p style={{ margin: 0, fontSize: 13, color: ui.color.textMuted, lineHeight: 1.6 }}>
          A policy researcher asks "what's happening in this district". A program designer asks "where do my target
          households live". The dashboard should support both reading directions without forcing one to detour through
          the other.
        </p>
      </Card>
    </div>
  );
}

// ── Compare & curate ─────────────────────────────────────────────────────────
function CompareCurateView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Compare & curate"
        lede="Move beyond single-place views: compare multiple districts and let users assemble their own dashboard."
      />

      <Card title="Multi-district comparison">
        <NoteList items={[
          { kind: 'planned', title: 'Multi-select districts',
            body: 'Pick more than two districts and hold them in a comparison set across pages.' },
          { kind: 'planned', title: 'Side-by-side bar / line graphs',
            body: 'Prevalence shown on the same axes for the chosen districts, so differences read at a glance.' },
        ]} />
      </Card>

      <Card title="User-curated dashboards">
        <NoteList items={[
          { kind: 'planned', title: 'Save a personal view',
            body: 'Let users assemble the charts they care about into their own dashboard, instead of scrolling the default one every time.' },
          { kind: 'planned', title: 'Filter scopes',
            body: 'Per-view filters for all-segments, rural-only, and urban-only — applied consistently across every chart in the curated dashboard.' },
        ]} />
      </Card>
    </div>
  );
}

// ── Visualization roadmap ────────────────────────────────────────────────────
function VizRoadmapView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Visualization roadmap"
        lede="Layout and disclosure changes that reduce cognitive load on every screen."
      />

      <Card title="Layout">
        <NoteList items={[
          { kind: 'planned', title: 'Horizontal segment layout',
            body: 'Lay segments out left-to-right rather than stacked vertically — easier to scan share-of-population at a glance.' },
        ]} />
      </Card>

      <Card title="Multi-level viewing">
        <NoteList items={[
          { kind: 'planned', title: 'Three-state → state → district',
            body: 'A consistent drill path so users always know which level they are at and how to step up or down.' },
          { kind: 'planned', title: 'Progressive disclosure',
            body: 'Show summary first, detail on demand. Avoid putting every breakdown on one screen.' },
        ]} />
      </Card>
    </div>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────
function HomeShell() {
  const [view, setView] = useState<ViewKey>('overview');

  return (
    <div style={{
      position: 'fixed',
      top: NAV_HEIGHT,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      background: ui.color.surfaceMuted,
      fontFamily: ui.font,
      zIndex: 50,
    }}>
      <Sidebar active={view} onSelect={setView} />
      <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {view === 'overview' && <OverviewView />}
        {view === 'comparison' && <ComparisonView />}
        {view === 'prevalence' && <PrevalenceMapView />}
        {view === 'coverage' && <CoverageView />}
        {view === 'entry-points' && <EntryPointsView />}
        {view === 'navigation' && <NavigationView />}
        {view === 'compare-curate' && <CompareCurateView />}
        {view === 'viz-roadmap' && <VizRoadmapView />}
      </main>
    </div>
  );
}

// ── Mount lifecycle ──────────────────────────────────────────────────────────
const MOUNT_ID = 'my-org-home-shell-root';

function ensureMountEl(): HTMLElement {
  let el = document.getElementById(MOUNT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = MOUNT_ID;
    document.body.appendChild(el);
  }
  return el;
}

function renderIfWelcome(): void {
  if (typeof document === 'undefined') return;
  const el = ensureMountEl();
  if (isWelcomeRoute(window.location.pathname)) {
    // Hide the underlying welcome content so our shell doesn't double-render.
    document.body.style.overflow = 'hidden';
    ReactDOM.render(<HomeShell />, el);
  } else {
    document.body.style.overflow = '';
    ReactDOM.unmountComponentAtNode(el);
  }
}

// SPA navigation interception. React Router calls history.pushState; the
// browser does not fire popstate for that, so we monkey-patch to detect.
function installRouteListener(): void {
  if ((window as any).__myOrgHomeShellRouteHooked) return;
  (window as any).__myOrgHomeShellRouteHooked = true;

  const fire = () => window.dispatchEvent(new Event('myorg:locationchange'));
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args: Parameters<typeof origPush>) {
    const ret = origPush.apply(this, args);
    fire();
    return ret;
  };
  history.replaceState = function (...args: Parameters<typeof origReplace>) {
    const ret = origReplace.apply(this, args);
    fire();
    return ret;
  };
  window.addEventListener('popstate', fire);
  window.addEventListener('myorg:locationchange', renderIfWelcome);
}

export function mount(): void {
  if (typeof document === 'undefined') return;
  installRouteListener();
  renderIfWelcome();
}

// Superset's ExtensionsLoader calls container.get('./index') then invokes the
// returned factory with zero arguments. We expose default + side-effect.
export default function activate(): void {
  mount();
}

if (typeof window !== 'undefined') {
  try {
    mount();
  } catch (err) {
    // Never throw from a Module Federation container.
    // eslint-disable-next-line no-console
    console.error('[home-shell] mount failed', err);
  }
}
