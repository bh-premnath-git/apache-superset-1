import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ui } from '../theme';
import {
  api,
  useFetch,
  CatalogCategory,
  CatalogMetric,
  CatalogBucket,
  MetricValues,
  BinaryMetricValues,
  CategoricalMetricValues,
} from '../api';
import { SegmentCode, SEGMENT_CODES } from '../nav';
import { useCrmState, RATING_STYLE, SegmentBrief } from '../crm';

// Screen 4 — Comparison tool.
//
// Side-by-side comparison of 2–3 CRM segments. Rows are data indicators;
// columns are the selected segments. The highest value in each row is
// highlighted green, the lowest light red, so the FSP can rank segments at
// a glance. Below the data rows: readiness pillars (Need / Access / Slack)
// and a one-line product + channel summary per segment.
//
// Defaults to comparing R2 vs R4 vs U2 — adjacent welfare-bridge / protection
// segments which is the most common FSP decision.

const DEFAULT_SEGMENTS: SegmentCode[] = ['R2', 'R4', 'U2'];
const MAX_SEGMENTS = 3;
const MIN_SEGMENTS = 2;

const COMPARE_KEY = 'crm.home.comparisonDraft';

const FOCUS_STATES = ['Bihar', 'Jharkhand', 'Madhya Pradesh'] as const;
type StateFilter = 'overall' | (typeof FOCUS_STATES)[number];

const INITIAL_KEYS = [
  'any_internet',
  'possess_mobile',
  'head_edu_level',
  'social_group',
  'ration_card',
];

const PRESET_ICON: Record<string, string> = {
  digital: '📶',
  education: '🎓',
  assets: '🏠',
  demographics: '👥',
  food: '🍚',
};

function fmtPct(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n)}%`;
}

function flattenMetrics(cats: CatalogCategory[]): CatalogMetric[] {
  return cats.flatMap((c) => c.metrics);
}

function findMetric(cats: CatalogCategory[], key: string): CatalogMetric | undefined {
  return flattenMetrics(cats).find((m) => m.key === key);
}

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

// ── Bar with optional differential highlight ────────────────────────────────

function ValueBar({
  pct,
  highlight,
}: {
  pct: number;
  highlight?: 'high' | 'low' | null;
}) {
  const bounded = Math.max(0, Math.min(100, pct));
  const fill =
    highlight === 'high' ? '#10b981' : highlight === 'low' ? '#fca5a5' : '#93c5fd';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 42px',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          position: 'relative',
          height: 12,
          background: ui.color.surfaceMuted,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${bounded}%`, height: '100%', background: fill }} />
      </div>
      <div style={{ textAlign: 'right', fontSize: 12, color: ui.color.text, fontWeight: 600 }}>
        {fmtPct(pct)}
      </div>
    </div>
  );
}

function CategoricalBar({
  breakdown,
  categories,
}: {
  breakdown: { category: string; share_pct: number }[];
  categories: CatalogBucket[];
}) {
  const byKey: Record<string, number> = {};
  for (const b of breakdown) byKey[b.category] = b.share_pct;
  return (
    <div
      style={{
        display: 'flex',
        height: 14,
        borderRadius: 3,
        overflow: 'hidden',
        background: ui.color.surfaceMuted,
      }}
    >
      {categories.map((c) => {
        const v = byKey[c.key] ?? 0;
        if (v <= 0) return null;
        return (
          <div
            key={c.key}
            title={`${c.label} · ${fmtPct(v)}`}
            style={{ width: `${v}%`, background: c.color }}
          />
        );
      })}
    </div>
  );
}

function CategoricalLegend({ categories }: { categories: CatalogBucket[] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        fontSize: 10,
        color: ui.color.textMuted,
        marginTop: 6,
      }}
    >
      {categories.map((c) => (
        <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span aria-hidden style={{ width: 8, height: 8, background: c.color, borderRadius: 2 }} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ── Add / remove modal (kept from previous version, simplified) ─────────────

function AddRemoveModal({
  catalog,
  selected,
  onClose,
  onApply,
}: {
  catalog: CatalogCategory[];
  selected: string[];
  onClose: () => void;
  onApply: (keys: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [search, setSearch] = useState('');

  const toggle = (key: string) =>
    setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));

  const filteredCats: CatalogCategory[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog
      .map((c) => ({
        ...c,
        metrics: c.metrics.filter(
          (m) => m.label.toLowerCase().includes(q) || c.label.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.metrics.length > 0);
  }, [catalog, search]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 92vw)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: ui.color.surface,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${ui.color.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ui.color.text }}>
            Select indicators ({draft.length})
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              padding: '6px 10px',
              fontSize: 12,
              border: `1px solid ${ui.color.border}`,
              borderRadius: 6,
              width: 200,
              background: ui.color.surface,
              color: ui.color.text,
              fontFamily: ui.font,
            }}
          />
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {filteredCats.map((c) => (
            <div key={c.key}>
              <div
                style={{
                  padding: '8px 18px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: ui.color.textMuted,
                  background: ui.color.surfaceMuted,
                  letterSpacing: 0.4,
                }}
              >
                {c.label}
              </div>
              {c.metrics.map((m) => {
                const on = draft.includes(m.key);
                return (
                  <label
                    key={m.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 18px',
                      fontSize: 13,
                      color: ui.color.text,
                      cursor: 'pointer',
                      borderBottom: `1px solid ${ui.color.border}`,
                    }}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(m.key)} />
                    <span style={{ flex: 1 }}>{m.label}</span>
                    {m.type === 'categorical' && (
                      <span style={{ fontSize: 11, color: ui.color.textMuted }}>
                        ({m.categories?.length ?? 0} cat.)
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        <div
          style={{
            padding: 14,
            borderTop: `1px solid ${ui.color.border}`,
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              border: `1px solid ${ui.color.border}`,
              borderRadius: 6,
              background: ui.color.surface,
              color: ui.color.text,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 6,
              background: ui.color.text,
              color: ui.color.surface,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PDF / CSV download ─────────────────────────────────────────────────────

function downloadPdfStub(
  rows: { label: string; values: { segment: string; value: string }[] }[],
  segments: SegmentCode[],
  stateFilter: StateFilter,
  briefOf: (code: SegmentCode) => SegmentBrief | undefined,
) {
  // Lightweight printable HTML — opens in a new tab where the user can use the
  // browser's "Save as PDF" print flow. Avoids a heavy PDF dependency.
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  const segHeader = segments
    .map((s) => `<th>${s} · ${briefOf(s)?.name ?? ''}</th>`)
    .join('');
  const body = rows
    .map(
      (r) =>
        `<tr><th style="text-align:left">${r.label}</th>${r.values
          .map((v) => `<td>${v.value}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  win.document.write(`
    <!doctype html>
    <html><head><title>CRM Comparison</title>
    <style>
      body { font-family: -apple-system, system-ui, sans-serif; padding: 24px; color: #111827; }
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: right; }
      th:first-child { text-align: left; background: #f8fafc; }
      thead th { background: #f1f5f9; text-align: left; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p { color: #6b7280; margin: 0 0 16px; font-size: 12px; }
    </style></head><body>
    <h1>CRM Segment Comparison</h1>
    <p>Geography: ${stateFilter === 'overall' ? FOCUS_STATES.join(', ') : stateFilter}. Generated ${new Date().toLocaleString()}.</p>
    <table>
      <thead><tr><th>Indicator</th>${segHeader}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <p style="margin-top:16px">Use your browser's <em>File → Print → Save as PDF</em> to export.</p>
    </body></html>
  `);
  win.document.close();
}

// ── Page ───────────────────────────────────────────────────────────────────

function ReadinessPill({ rating, note }: { rating: 'High' | 'Med' | 'Low'; note: string }) {
  const style = RATING_STYLE[rating];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 999,
          background: style.bg,
          color: style.fg,
          width: 'fit-content',
        }}
      >
        {rating}
      </span>
      <span style={{ fontSize: 11, color: ui.color.textMuted, lineHeight: 1.4 }}>{note}</span>
    </div>
  );
}

export function ComparisonView() {
  const catalog = useFetch(() => api.metricsCatalog(), []);
  const crmState = useCrmState();
  const crm = crmState.data;
  const briefOf = (c: SegmentCode): SegmentBrief | undefined =>
    crm?.segmentByCode.get(c);

  const [segments, setSegments] = useState<SegmentCode[]>(() => {
    const draft = readArr(COMPARE_KEY);
    return draft.length >= MIN_SEGMENTS ? draft.slice(0, MAX_SEGMENTS) : DEFAULT_SEGMENTS;
  });
  const [selected, setSelected] = useState<string[]>(INITIAL_KEYS);
  const [modalOpen, setModalOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState<StateFilter>('overall');

  const cats = catalog.data?.categories ?? [];

  useEffect(() => {
    if (!cats.length) return;
    const valid = new Set(flattenMetrics(cats).map((m) => m.key));
    setSelected((cur) => {
      const filtered = cur.filter((k) => valid.has(k));
      return filtered.length === cur.length ? cur : filtered;
    });
  }, [cats]);

  const stateArg = stateFilter === 'overall' ? undefined : [stateFilter];

  const values = useFetch(
    () =>
      selected.length
        ? api.metricsValues(selected, stateArg)
        : Promise.resolve({
            states_focus: [],
            segments: [...SEGMENT_CODES],
            metrics: [] as MetricValues[],
          }),
    [selected.join(','), stateFilter],
  );

  const orderedMetrics: MetricValues[] = useMemo(() => {
    const map = new Map<string, MetricValues>();
    for (const m of values.data?.metrics ?? []) map.set(m.key, m);
    return selected.map((k) => map.get(k)).filter((m): m is MetricValues => !!m);
  }, [values.data, selected]);

  const presetCategory = (catKey: string) => {
    const cat = cats.find((c) => c.key === catKey);
    if (!cat) return;
    setSelected(cat.metrics.slice(0, 5).map((m) => m.key));
  };

  const toggleSegment = (code: SegmentCode) => {
    setSegments((cur) => {
      let next: SegmentCode[];
      if (cur.includes(code)) {
        if (cur.length <= MIN_SEGMENTS) return cur;
        next = cur.filter((c) => c !== code);
      } else {
        next = cur.length >= MAX_SEGMENTS ? [...cur.slice(1), code] : [...cur, code];
      }
      writeArr(COMPARE_KEY, next);
      return next;
    });
  };

  // Pre-compute high/low per binary row for differential highlighting.
  const rowExtremes = useMemo(() => {
    const out = new Map<string, { hi: SegmentCode | null; lo: SegmentCode | null }>();
    for (const m of orderedMetrics) {
      if (m.type !== 'binary') continue;
      const bm = m as BinaryMetricValues;
      const vals: { code: SegmentCode; v: number }[] = segments
        .map((c) => ({ code: c, v: bm.values.find((x) => x.segment === c)?.share_pct ?? 0 }));
      if (!vals.length) continue;
      const hi = vals.reduce((a, b) => (b.v > a.v ? b : a));
      const lo = vals.reduce((a, b) => (b.v < a.v ? b : a));
      out.set(m.key, {
        hi: hi.v === lo.v ? null : hi.code,
        lo: hi.v === lo.v ? null : lo.code,
      });
    }
    return out;
  }, [orderedMetrics, segments]);

  // Build flat row list for PDF / CSV export.
  const exportRows = useMemo(() => {
    const rows: { label: string; values: { segment: string; value: string }[] }[] = [];
    for (const m of orderedMetrics) {
      if (m.type === 'binary') {
        rows.push({
          label: m.label,
          values: segments.map((c) => ({
            segment: c,
            value: fmtPct((m as BinaryMetricValues).values.find((x) => x.segment === c)?.share_pct ?? 0),
          })),
        });
      } else {
        const cm = m as CategoricalMetricValues;
        for (const cat of cm.categories) {
          rows.push({
            label: `${m.label} — ${cat.label}`,
            values: segments.map((c) => {
              const seg = cm.values.find((x) => x.segment === c);
              const bk = seg?.breakdown.find((b) => b.category === cat.key)?.share_pct ?? 0;
              return { segment: c, value: fmtPct(bk) };
            }),
          });
        }
      }
    }
    // Append readiness rows.
    for (const pillar of ['need', 'access', 'slack'] as const) {
      rows.push({
        label: `Readiness · ${pillar.charAt(0).toUpperCase() + pillar.slice(1)}`,
        values: segments.map((c) => ({
          segment: c,
          value: briefOf(c)?.readiness?.[pillar]?.rating ?? '—',
        })),
      });
    }
    rows.push({
      label: 'Lead product',
      values: segments.map((c) => ({ segment: c, value: briefOf(c)?.product.headline ?? '—' })),
    });
    rows.push({
      label: 'Channel',
      values: segments.map((c) => ({ segment: c, value: briefOf(c)?.channel.headline ?? '—' })),
    });
    return rows;
  }, [orderedMetrics, segments, crm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: ui.color.text }}>
            Comparison tool
          </h1>
          <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13, maxWidth: 720 }}>
            Pick 2–3 segments to compare side-by-side across data indicators, readiness pillars,
            product hypothesis and channel ladder. Highest value per row highlighted green;
            lowest red.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => downloadPdfStub(exportRows, segments, stateFilter, briefOf)}
            style={{
              padding: '8px 14px',
              border: `1px solid ${ui.color.border}`,
              borderRadius: 6,
              background: ui.color.surface,
              color: ui.color.text,
              cursor: 'pointer',
              fontSize: 13,
            }}
            title="Open print-ready view (Save as PDF in browser)"
          >
            Download as PDF
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 6,
              background: ui.color.text,
              color: ui.color.surface,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Add / remove indicators
          </button>
        </div>
      </div>

      {/* Segment selector */}
      <div
        style={{
          background: ui.color.surface,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 10,
          padding: '12px 14px',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: ui.color.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
          Segments to compare ({segments.length}/{MAX_SEGMENTS})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SEGMENT_CODES.map((c) => {
            const on = segments.includes(c);
            const brief = briefOf(c);
            const badgeBg = brief?.tier_badge_bg ?? ui.color.surfaceMuted;
            const badgeColor = brief?.tier_badge_color ?? ui.color.text;
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleSegment(c)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  border: `1px solid ${on ? badgeColor : ui.color.border}`,
                  borderRadius: 999,
                  background: on ? badgeBg : ui.color.surface,
                  color: on ? badgeColor : ui.color.text,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: on ? 700 : 500,
                  fontFamily: ui.font,
                }}
              >
                {on ? '✓ ' : ''}
                {c}{brief?.name ? ` · ${brief.name}` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13, color: ui.color.text }}>Explore by category</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cats.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => presetCategory(c.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  border: `1px solid ${ui.color.border}`,
                  borderRadius: 8,
                  background: ui.color.surface,
                  color: ui.color.text,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: ui.font,
                }}
              >
                <span aria-hidden>{PRESET_ICON[c.key] ?? '•'}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'inline-flex', border: `1px solid ${ui.color.border}`, borderRadius: 6, overflow: 'hidden' }}>
          {(['overall', ...FOCUS_STATES] as StateFilter[]).map((s, i) => {
            const active = s === stateFilter;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStateFilter(s)}
                style={{
                  padding: '6px 12px',
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
                {s === 'overall' ? 'Overall' : s}
              </button>
            );
          })}
        </div>
      </div>

      {(catalog.error || values.error) && (
        <div
          style={{
            padding: 12,
            border: `1px solid ${ui.color.border}`,
            borderRadius: 8,
            color: '#b00020',
            fontSize: 12,
            background: '#fff5f5',
          }}
        >
          Could not load comparison data: {(catalog.error ?? values.error)?.message}
        </div>
      )}

      {/* Comparison table — rows = indicators, columns = segments */}
      <div
        style={{
          border: `1px solid ${ui.color.border}`,
          borderRadius: 10,
          overflow: 'auto',
          background: ui.color.surface,
        }}
      >
        {selected.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: ui.color.textMuted, fontSize: 13 }}>
            No indicators selected. Use <strong>Add / remove indicators</strong> or pick a category
            above.
          </div>
        ) : (
          <table
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              width: '100%',
              minWidth: 360 + segments.length * 220,
              fontFamily: ui.font,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: ui.color.surface,
                    textAlign: 'left',
                    padding: '14px 16px',
                    fontSize: 12,
                    color: ui.color.textMuted,
                    fontWeight: 700,
                    borderBottom: `1px solid ${ui.color.border}`,
                    minWidth: 280,
                    zIndex: 1,
                  }}
                >
                  Indicator
                </th>
                {segments.map((c) => {
                  const brief = briefOf(c);
                  return (
                    <th
                      key={c}
                      style={{
                        textAlign: 'left',
                        padding: '14px 16px',
                        fontSize: 12,
                        color: ui.color.text,
                        fontWeight: 700,
                        borderBottom: `1px solid ${ui.color.border}`,
                        minWidth: 200,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: brief?.tier_badge_bg ?? ui.color.surfaceMuted,
                            color: brief?.tier_badge_color ?? ui.color.text,
                          }}
                        >
                          {c}
                        </span>
                        <span style={{ fontSize: 12 }}>{brief?.name ?? ''}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Indicator rows */}
              {orderedMetrics.map((m, i) => (
                <tr key={m.key} style={{ background: i % 2 === 0 ? ui.color.surface : ui.color.surfaceMuted }}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      background: 'inherit',
                      padding: '14px 16px',
                      fontSize: 13,
                      color: ui.color.text,
                      fontWeight: 600,
                      borderBottom: `1px solid ${ui.color.border}`,
                      zIndex: 1,
                    }}
                  >
                    <div>{m.label}</div>
                    <div style={{ fontSize: 10, color: ui.color.textMuted }}>{m.category_label}</div>
                    {m.type === 'categorical' && (
                      <CategoricalLegend categories={(m as CategoricalMetricValues).categories} />
                    )}
                  </td>
                  {segments.map((c) => {
                    const isBin = m.type === 'binary';
                    const ext = rowExtremes.get(m.key);
                    const highlight: 'high' | 'low' | null = ext
                      ? c === ext.hi
                        ? 'high'
                        : c === ext.lo
                          ? 'low'
                          : null
                      : null;
                    return (
                      <td
                        key={c}
                        style={{
                          padding: '14px 16px',
                          borderBottom: `1px solid ${ui.color.border}`,
                          verticalAlign: 'middle',
                        }}
                      >
                        {isBin ? (
                          <ValueBar
                            pct={(m as BinaryMetricValues).values.find((v) => v.segment === c)?.share_pct ?? 0}
                            highlight={highlight}
                          />
                        ) : (
                          <CategoricalBar
                            breakdown={(m as CategoricalMetricValues).values.find((v) => v.segment === c)?.breakdown ?? []}
                            categories={(m as CategoricalMetricValues).categories}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Readiness divider */}
              <tr>
                <td
                  colSpan={segments.length + 1}
                  style={{
                    padding: '12px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: ui.color.textMuted,
                    background: ui.color.surfaceMuted,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    borderTop: `2px solid ${ui.color.text}`,
                    borderBottom: `1px solid ${ui.color.border}`,
                  }}
                >
                  Readiness pillars
                </td>
              </tr>

              {(['need', 'access', 'slack'] as const).map((pillar, i) => (
                <tr key={pillar} style={{ background: i % 2 === 0 ? ui.color.surface : ui.color.surfaceMuted }}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      background: 'inherit',
                      padding: '14px 16px',
                      fontSize: 13,
                      color: ui.color.text,
                      fontWeight: 600,
                      borderBottom: `1px solid ${ui.color.border}`,
                      zIndex: 1,
                      textTransform: 'capitalize',
                    }}
                  >
                    {pillar}
                  </td>
                  {segments.map((c) => {
                    const r = briefOf(c)?.readiness?.[pillar];
                    return (
                      <td
                        key={c}
                        style={{
                          padding: '14px 16px',
                          borderBottom: `1px solid ${ui.color.border}`,
                          verticalAlign: 'top',
                        }}
                      >
                        <ReadinessPill
                          rating={(r?.rating as 'High' | 'Med' | 'Low') ?? 'Med'}
                          note={r?.note ?? (crmState.loading ? 'Loading…' : '—')}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Product / channel summary */}
              <tr>
                <td
                  colSpan={segments.length + 1}
                  style={{
                    padding: '12px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: ui.color.textMuted,
                    background: ui.color.surfaceMuted,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    borderTop: `2px solid ${ui.color.text}`,
                    borderBottom: `1px solid ${ui.color.border}`,
                  }}
                >
                  Product &amp; channel hypothesis
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: ui.color.surface,
                    padding: '14px 16px',
                    fontSize: 13,
                    color: ui.color.text,
                    fontWeight: 600,
                    borderBottom: `1px solid ${ui.color.border}`,
                    zIndex: 1,
                  }}
                >
                  Lead product
                </td>
                {segments.map((c) => {
                  const brief = briefOf(c);
                  return (
                    <td
                      key={c}
                      style={{
                        padding: '14px 16px',
                        borderBottom: `1px solid ${ui.color.border}`,
                        verticalAlign: 'top',
                        fontSize: 12,
                        color: ui.color.text,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: 4 }}>
                        {brief?.product.headline ?? (crmState.loading ? 'Loading…' : '—')}
                      </strong>
                      <span style={{ color: ui.color.textMuted }}>
                        {brief?.product.body ?? ''}
                      </span>
                    </td>
                  );
                })}
              </tr>
              <tr style={{ background: ui.color.surfaceMuted }}>
                <td
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: 'inherit',
                    padding: '14px 16px',
                    fontSize: 13,
                    color: ui.color.text,
                    fontWeight: 600,
                    borderBottom: `1px solid ${ui.color.border}`,
                    zIndex: 1,
                  }}
                >
                  Channel
                </td>
                {segments.map((c) => {
                  const brief = briefOf(c);
                  const ladder = brief?.channel_ladder ?? [];
                  return (
                  <td
                    key={c}
                    style={{
                      padding: '14px 16px',
                      borderBottom: `1px solid ${ui.color.border}`,
                      verticalAlign: 'top',
                      fontSize: 12,
                      color: ui.color.text,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: 4 }}>
                      {brief?.channel.headline ?? (crmState.loading ? 'Loading…' : '—')}
                    </strong>
                    <span style={{ color: ui.color.textMuted, display: 'block', marginBottom: 6 }}>
                      {brief?.channel.body ?? ''}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 10 }}>
                      {ladder.map((s, j, arr) => (
                        <React.Fragment key={`${s}-${j}`}>
                          <span
                            style={{
                              padding: '2px 6px',
                              background: ui.color.surface,
                              borderRadius: 999,
                              border: `1px solid ${ui.color.border}`,
                              fontWeight: 600,
                            }}
                          >
                            {s}
                          </span>
                          {j < arr.length - 1 && (
                            <span style={{ color: ui.color.textMuted }}>→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )}
        {(catalog.loading || values.loading) && selected.length > 0 && (
          <div style={{ padding: '12px 16px', fontSize: 12, color: ui.color.textMuted }}>
            Loading…
          </div>
        )}
      </div>

      {modalOpen && (
        <AddRemoveModal
          catalog={cats}
          selected={selected}
          onClose={() => setModalOpen(false)}
          onApply={setSelected}
        />
      )}
    </div>
  );
}
