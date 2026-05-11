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
} from '../api';

// Pathways-style comparison tool for the Indian LCA segmentation.
// Rows are LCA segments (R1..U3); columns are indicators picked from a
// catalog grouped by "health-area"-style categories. Binary indicators
// render as a single horizontal bar with the weighted % per segment;
// categorical indicators render as a stacked multi-color bar across an
// ordered list of buckets. All values come from /metrics/values, which
// re-aggregates household.hh_master against the LCA segment view.

const SEGMENT_ORDER = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'] as const;
const SEGMENT_LABEL: Record<string, string> = {
  R1: 'R1 · Connected rural',
  R2: 'R2 · Digitally engaged rural',
  R3: 'R3 · Low-connectivity rural',
  R4: 'R4 · Most constrained rural',
  U1: 'U1 · Connected urban',
  U2: 'U2 · Digitally engaged urban',
  U3: 'U3 · Most constrained urban',
};

// Initial selection — roughly mirrors the screenshot mix of binary +
// categorical indicators (illness count proxy, hospitalisation proxy,
// education attainment, social group, ration card).
const INITIAL_KEYS = [
  'any_internet',
  'possess_mobile',
  'head_edu_level',
  'social_group',
  'ration_card',
];

// "Explore by health area" preset categories. Clicking one replaces the
// current selection with up to N metrics from that category.
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

// ─── Bar cells ───────────────────────────────────────────────────────────────

function BinaryBar({ pct }: { pct: number }) {
  const bounded = Math.max(0, Math.min(100, pct));
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
        <div
          style={{
            width: `${bounded}%`,
            height: '100%',
            background: '#93c5fd',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '33%',
            top: -2,
            bottom: -2,
            width: 0,
            borderLeft: `1px dashed ${ui.color.textMuted}`,
            opacity: 0.6,
          }}
        />
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
        gap: 10,
        fontSize: 11,
        color: ui.color.textMuted,
        marginTop: 6,
      }}
    >
      {categories.map((c) => (
        <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span
            aria-hidden
            style={{ width: 10, height: 10, background: c.color, borderRadius: 2 }}
          />
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ─── Add / remove modal ──────────────────────────────────────────────────────

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

  const totalCount = useMemo(
    () => catalog.reduce((acc, c) => acc + c.metrics.length, 0),
    [catalog],
  );

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
          width: 'min(960px, 92vw)',
          maxHeight: '88vh',
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          background: ui.color.surface,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Left: catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${ui.color.border}` }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${ui.color.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ui.color.text }}>
                Select data to compare
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: ui.color.textMuted }}>
                All data ({totalCount}) · Filter: <span style={{ color: ui.color.chipText, fontWeight: 600 }}>Health area ▾</span>
              </p>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for anything"
              style={{
                padding: '8px 12px',
                fontSize: 13,
                border: `1px solid ${ui.color.border}`,
                borderRadius: 6,
                width: 220,
                background: ui.color.surfaceMuted,
                color: ui.color.text,
                fontFamily: ui.font,
              }}
            />
          </div>
          <div style={{ overflow: 'auto', padding: '8px 0' }}>
            {filteredCats.map((c) => (
              <div key={c.key}>
                <div
                  style={{
                    padding: '10px 20px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: ui.color.textMuted,
                    background: ui.color.surfaceMuted,
                    letterSpacing: 0.2,
                  }}
                >
                  {c.label} ({c.metrics.length})
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
                        padding: '10px 20px',
                        fontSize: 13,
                        color: ui.color.text,
                        cursor: 'pointer',
                        borderBottom: `1px solid ${ui.color.border}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(m.key)}
                        style={{ cursor: 'pointer' }}
                      />
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
        </div>

        {/* Right: selected chips + actions */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${ui.color.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ui.color.text }}>
              Selected data ({draft.length})
            </h3>
            <button
              type="button"
              onClick={() => setDraft([])}
              style={{
                border: 'none',
                background: 'transparent',
                color: ui.color.chipText,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear all
            </button>
          </div>
          <div style={{ flex: 1, padding: 16, overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
            {draft.length === 0 && (
              <p style={{ color: ui.color.textMuted, fontSize: 12 }}>
                Nothing selected yet. Pick metrics from the left.
              </p>
            )}
            {draft.map((k) => {
              const m = findMetric(catalog, k);
              if (!m) return null;
              return (
                <span
                  key={k}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    background: ui.color.surfaceMuted,
                    border: `1px solid ${ui.color.border}`,
                    borderRadius: 999,
                    fontSize: 12,
                    color: ui.color.text,
                  }}
                >
                  {m.label}
                  <button
                    type="button"
                    onClick={() => toggle(k)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: ui.color.textMuted,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          <div
            style={{
              padding: 16,
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
              Compare →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ComparisonView() {
  const catalog = useFetch(() => api.metricsCatalog(), []);

  const [selected, setSelected] = useState<string[]>(INITIAL_KEYS);
  const [modalOpen, setModalOpen] = useState(false);
  const [stdError, setStdError] = useState(false);

  const cats = catalog.data?.categories ?? [];

  // Once the catalog loads, filter the initial selection to only keys that
  // actually exist (covers any backend drift).
  useEffect(() => {
    if (!cats.length) return;
    const valid = new Set(flattenMetrics(cats).map((m) => m.key));
    setSelected((cur) => {
      const filtered = cur.filter((k) => valid.has(k));
      return filtered.length === cur.length ? cur : filtered;
    });
  }, [cats]);

  const values = useFetch(
    () => (selected.length ? api.metricsValues(selected) : Promise.resolve({
      states_focus: [], segments: [...SEGMENT_ORDER], metrics: [] as MetricValues[],
    })),
    [selected.join(',')],
  );

  // Preserve column order matching `selected` (the backend doesn't guarantee
  // input order on the response).
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: ui.color.text }}>
            Comparison tool
          </h1>
          <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13, maxWidth: 640 }}>
            Compare household indicators across the seven LCA segments. Browse by category or add
            or remove data points individually. Values are weighted shares from the focus states
            (Bihar, Jharkhand, Madhya Pradesh).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            style={{
              padding: '8px 14px',
              border: `1px solid ${ui.color.border}`,
              borderRadius: 6,
              background: ui.color.surface,
              color: ui.color.text,
              cursor: 'pointer',
              fontSize: 13,
            }}
            title="Export not yet wired up"
          >
            Export
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
            Add / remove data →
          </button>
        </div>
      </div>

      {/* Controls strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13, color: ui.color.text }}>Explore by category</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cats.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => presetCategory(c.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: ui.color.textMuted, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={stdError}
              onChange={(e) => setStdError(e.target.checked)}
            />
            Standard error {stdError ? 'on' : 'off'}
          </label>
          <button
            type="button"
            onClick={() => setSelected([])}
            style={{
              border: 'none',
              background: 'transparent',
              color: ui.color.chipText,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear all data
          </button>
        </div>
      </div>

      {/* Errors */}
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

      {/* Matrix */}
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
            No data points selected. Use <strong>Add / remove data</strong> or a category button
            above to pick indicators.
          </div>
        ) : (
          <table
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              width: '100%',
              minWidth: 200 + orderedMetrics.length * 200,
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
                    fontWeight: 600,
                    borderBottom: `1px solid ${ui.color.border}`,
                    minWidth: 220,
                    zIndex: 1,
                  }}
                >
                  Segment
                </th>
                {orderedMetrics.map((m) => (
                  <th
                    key={m.key}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      fontSize: 12,
                      color: ui.color.chipText,
                      fontWeight: 700,
                      borderBottom: `1px solid ${ui.color.border}`,
                      minWidth: 200,
                    }}
                    title={`${m.category_label} · ${m.type}`}
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEGMENT_ORDER.map((seg, i) => (
                <tr key={seg} style={{ background: i % 2 === 0 ? ui.color.surface : ui.color.surfaceMuted }}>
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
                    {SEGMENT_LABEL[seg]}
                  </td>
                  {orderedMetrics.map((m) => (
                    <td
                      key={m.key}
                      style={{
                        padding: '14px 16px',
                        borderBottom: `1px solid ${ui.color.border}`,
                        verticalAlign: 'middle',
                      }}
                    >
                      {m.type === 'binary' ? (
                        <BinaryBar
                          pct={
                            m.values.find((v) => v.segment === seg)?.share_pct ?? 0
                          }
                        />
                      ) : (
                        <CategoricalBar
                          breakdown={
                            m.values.find((v) => v.segment === seg)?.breakdown ?? []
                          }
                          categories={m.categories}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Legends row for categorical columns */}
              <tr>
                <td style={{ padding: '10px 16px', background: ui.color.surface }} />
                {orderedMetrics.map((m) => (
                  <td
                    key={m.key}
                    style={{
                      padding: '10px 16px',
                      background: ui.color.surface,
                      verticalAlign: 'top',
                    }}
                  >
                    {m.type === 'categorical' && <CategoricalLegend categories={m.categories} />}
                  </td>
                ))}
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
