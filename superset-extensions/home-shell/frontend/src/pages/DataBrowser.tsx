import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ui } from '../theme';
import {
  api,
  useFetch,
  CatalogCategory,
  CatalogMetric,
  MetricValues,
} from '../api';

// Pathways-style "Data browser": pick one indicator at a time from a
// searchable, category-grouped list and render its value across the
// LCA segments as a bar chart with a sample-average reference line.
// Re-uses the existing /metrics/catalog and /metrics/values endpoints.

const SEGMENT_ORDER = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'] as const;

const TAB_ICON: Record<string, string> = {
  digital: 'D',
  education: 'E',
  assets: 'A',
  demographics: 'P',
  food: 'F',
};

const FOCUS_DENOMINATOR =
  'Households in Bihar, Jharkhand and Madhya Pradesh (NSS-weighted).';

function fmtPct(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function flattenMetrics(cats: CatalogCategory[]): CatalogMetric[] {
  return cats.flatMap((c) => c.metrics);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Chart ──────────────────────────────────────────────────────────────────

function BarChart({
  metric,
  data,
  stdError,
}: {
  metric: MetricValues;
  data: { segment: string; share_pct: number }[];
  stdError: boolean;
}) {
  const max = Math.max(100, ...data.map((d) => d.share_pct));
  const avg = average(data.map((d) => d.share_pct));
  const chartH = 280;
  const chartTopPad = 28;
  const usableH = chartH - chartTopPad - 30;
  const avgY = chartTopPad + usableH * (1 - avg / max);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: ui.color.text }}>
          {metric.label}
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            fontSize: 12,
            color: ui.color.textMuted,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 18,
              borderTop: `1px dashed ${ui.color.textMuted}`,
            }}
          />
          Sample average
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          height: chartH,
          padding: '0 12px',
          borderRadius: 6,
          background: ui.color.surface,
        }}
      >
        {/* Sample-average reference line */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: avgY,
            borderTop: `1px dashed ${ui.color.textMuted}`,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: avgY - 11,
            background: ui.color.text,
            color: ui.color.surface,
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          {fmtPct(avg)}
        </div>

        {/* Bars */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: chartTopPad,
            bottom: 30,
            display: 'grid',
            gridTemplateColumns: `repeat(${data.length}, 1fr)`,
            alignItems: 'end',
            gap: 14,
          }}
        >
          {data.map((d) => {
            const h = Math.max(2, usableH * (d.share_pct / max));
            // Small symmetric error wedge — placeholder until backend exposes SE.
            const se = stdError ? Math.min(8, Math.max(1.5, d.share_pct * 0.06)) : 0;
            const seTop = usableH * Math.min(1, (d.share_pct + se) / max);
            const seBot = usableH * Math.max(0, (d.share_pct - se) / max);
            return (
              <div
                key={d.segment}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: ui.color.text,
                    marginBottom: 4,
                  }}
                >
                  {fmtPct(d.share_pct)}
                </div>
                <div
                  style={{
                    position: 'relative',
                    width: '70%',
                    maxWidth: 56,
                    height: h,
                    background: '#93c5fd',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  {stdError && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        top: -(seTop - h),
                        height: seTop - seBot,
                        width: 2,
                        background: ui.color.text,
                        opacity: 0.65,
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: -4,
                          width: 10,
                          height: 1,
                          background: ui.color.text,
                          opacity: 0.65,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: -4,
                          width: 10,
                          height: 1,
                          background: ui.color.text,
                          opacity: 0.65,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 8,
            display: 'grid',
            gridTemplateColumns: `repeat(${data.length}, 1fr)`,
            gap: 14,
            textAlign: 'center',
            fontSize: 12,
            color: ui.color.text,
            fontWeight: 600,
          }}
        >
          {data.map((d) => (
            <div key={d.segment}>{d.segment}</div>
          ))}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: ui.color.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          justifyContent: 'center',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            width: 14,
            height: 14,
            borderRadius: 999,
            border: `1px solid ${ui.color.textMuted}`,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          i
        </span>
        Denominator: {FOCUS_DENOMINATOR}
      </div>
    </div>
  );
}

// Stacked bar chart for categorical metrics: each segment column is a stack
// of the bucket shares, drawn as a 100%-stacked vertical bar.
function StackedBarChart({
  metric,
  values,
}: {
  metric: Extract<MetricValues, { type: 'categorical' }>;
  values: { segment: string; breakdown: { category: string; share_pct: number }[] }[];
}) {
  const chartH = 280;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: ui.color.text }}>
          {metric.label}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: ui.color.textMuted }}>
          Distribution across categories
        </div>
      </div>

      <div
        style={{
          height: chartH,
          padding: '12px 12px 30px',
          background: ui.color.surface,
          borderRadius: 6,
          display: 'grid',
          gridTemplateColumns: `repeat(${values.length}, 1fr)`,
          gap: 14,
          alignItems: 'end',
          position: 'relative',
        }}
      >
        {values.map((v) => {
          const byKey: Record<string, number> = {};
          for (const b of v.breakdown) byKey[b.category] = b.share_pct;
          return (
            <div
              key={v.segment}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  width: '70%',
                  maxWidth: 56,
                  height: '100%',
                  borderRadius: '4px 4px 0 0',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {metric.categories.map((c) => {
                  const pct = byKey[c.key] ?? 0;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={c.key}
                      title={`${c.label} · ${fmtPct(pct)}`}
                      style={{
                        height: `${pct}%`,
                        background: c.color,
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: ui.color.text,
                }}
              >
                {v.segment}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          fontSize: 12,
          color: ui.color.textMuted,
        }}
      >
        {metric.categories.map((c) => (
          <span
            key={c.key}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                background: c.color,
                borderRadius: 2,
              }}
            />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function DataBrowserView() {
  const catalog = useFetch(() => api.metricsCatalog(), []);
  const cats = catalog.data?.categories ?? [];

  const [tab, setTab] = useState<string>('all'); // 'all' | category key
  const [search, setSearch] = useState('');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);
  const [stdError, setStdError] = useState(false);

  // First-load defaults: expand all category groups, pick the first metric.
  useEffect(() => {
    if (!cats.length) return;
    setOpenCats((cur) => {
      if (Object.keys(cur).length) return cur;
      return Object.fromEntries(cats.map((c) => [c.key, true]));
    });
    setSelectedKey((cur) => cur ?? cats[0].metrics[0]?.key);
  }, [cats]);

  // Categories scoped to the active tab.
  const visibleCats: CatalogCategory[] = useMemo(() => {
    const base = tab === 'all' ? cats : cats.filter((c) => c.key === tab);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base
      .map((c) => ({
        ...c,
        metrics: c.metrics.filter(
          (m) =>
            m.label.toLowerCase().includes(q) ||
            c.label.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.metrics.length > 0);
  }, [cats, tab, search]);

  // If the active selection is filtered out, fall back to the first visible one.
  useEffect(() => {
    if (!visibleCats.length) return;
    const present = new Set(
      visibleCats.flatMap((c) => c.metrics.map((m) => m.key)),
    );
    if (!selectedKey || !present.has(selectedKey)) {
      setSelectedKey(visibleCats[0].metrics[0]?.key);
    }
  }, [visibleCats, selectedKey]);

  const selectedMetric = useMemo(() => {
    if (!selectedKey) return undefined;
    return flattenMetrics(cats).find((m) => m.key === selectedKey);
  }, [cats, selectedKey]);

  const selectedCategory = useMemo(() => {
    if (!selectedKey) return undefined;
    return cats.find((c) => c.metrics.some((m) => m.key === selectedKey));
  }, [cats, selectedKey]);

  const values = useFetch(
    () =>
      selectedKey
        ? api.metricsValues([selectedKey])
        : Promise.resolve({
            states_focus: [],
            segments: [...SEGMENT_ORDER],
            metrics: [] as MetricValues[],
          }),
    [selectedKey ?? ''],
  );

  const currentValues = values.data?.metrics?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: ui.color.text }}>
            Data browser
          </h1>
          <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13, maxWidth: 720 }}>
            Explore how LCA segments differ on individual household indicators.
            Browse by category below or search for a specific indicator to see
            its segment-by-segment share.
          </p>
        </div>
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
      </div>

      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ fontSize: 13, color: ui.color.text }}>
          Explore by category
        </strong>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: ui.color.textMuted,
            cursor: 'pointer',
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              width: 14,
              height: 14,
              borderRadius: 999,
              border: `1px solid ${ui.color.textMuted}`,
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            i
          </span>
          · Standard error
          <span
            role="switch"
            aria-checked={stdError}
            onClick={() => setStdError((s) => !s)}
            style={{
              display: 'inline-block',
              width: 28,
              height: 16,
              borderRadius: 999,
              background: stdError ? ui.color.text : ui.color.border,
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: stdError ? 14 : 2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: ui.color.surface,
                transition: 'left 0.15s',
              }}
            />
          </span>
          {stdError ? 'on' : 'off'}
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'All data' } as { key: string; label: string }]
          .concat(cats.map((c) => ({ key: c.key, label: c.label })))
          .map((t) => {
            const isOn = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  border: `1px solid ${isOn ? ui.color.text : ui.color.border}`,
                  borderRadius: 8,
                  background: ui.color.surface,
                  color: ui.color.text,
                  fontSize: 13,
                  fontWeight: isOn ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: ui.font,
                }}
              >
                {t.key !== 'all' && (
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-flex',
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: ui.color.surfaceMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: ui.color.chipText,
                    }}
                  >
                    {TAB_ICON[t.key] ?? '•'}
                  </span>
                )}
                {t.label}
              </button>
            );
          })}
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
          Could not load data browser: {(catalog.error ?? values.error)?.message}
        </div>
      )}

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: 16,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 10,
          background: ui.color.surface,
          overflow: 'hidden',
          minHeight: 520,
        }}
      >
        {/* Left: search + grouped list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRight: `1px solid ${ui.color.border}`,
            minWidth: 0,
          }}
        >
          <div style={{ padding: 14, borderBottom: `1px solid ${ui.color.border}` }}>
            <div style={{ position: 'relative' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this list"
                style={{
                  width: '100%',
                  padding: '8px 32px 8px 12px',
                  fontSize: 13,
                  border: `1px solid ${ui.color.border}`,
                  borderRadius: 6,
                  background: ui.color.surface,
                  color: ui.color.text,
                  fontFamily: ui.font,
                  boxSizing: 'border-box',
                }}
              />
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: ui.color.textMuted,
                  fontSize: 14,
                }}
              >
                ⌕
              </span>
            </div>
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            <div
              style={{
                padding: '12px 14px 6px',
                fontSize: 12,
                fontWeight: 700,
                color: ui.color.text,
              }}
            >
              Household indicators
            </div>
            {visibleCats.length === 0 && (
              <div style={{ padding: 14, fontSize: 12, color: ui.color.textMuted }}>
                No indicators match “{search}”.
              </div>
            )}
            {visibleCats.map((c) => {
              const open = openCats[c.key] !== false; // default open
              return (
                <div key={c.key}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenCats((cur) => ({ ...cur, [c.key]: !open }))
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 14px',
                      border: 'none',
                      background: 'transparent',
                      color: ui.color.text,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: ui.font,
                      borderTop: `1px solid ${ui.color.border}`,
                    }}
                  >
                    <span>{c.label}</span>
                    <span style={{ color: ui.color.textMuted, fontSize: 12 }}>
                      {open ? '▾' : '▸'}
                    </span>
                  </button>
                  {open &&
                    c.metrics.map((m) => {
                      const isOn = m.key === selectedKey;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setSelectedKey(m.key)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 14px 8px 26px',
                            border: 'none',
                            borderLeft: `3px solid ${
                              isOn ? ui.color.text : 'transparent'
                            }`,
                            background: isOn ? ui.color.surfaceMuted : 'transparent',
                            color: ui.color.text,
                            fontSize: 13,
                            fontWeight: isOn ? 600 : 400,
                            cursor: 'pointer',
                            fontFamily: ui.font,
                          }}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: chart */}
        <div
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            minWidth: 0,
          }}
        >
          {!selectedMetric && (
            <div
              style={{
                margin: 'auto',
                color: ui.color.textMuted,
                fontSize: 13,
              }}
            >
              Pick an indicator from the list to see its breakdown.
            </div>
          )}
          {selectedMetric && (catalog.loading || values.loading) && !currentValues && (
            <div style={{ margin: 'auto', color: ui.color.textMuted, fontSize: 13 }}>
              Loading…
            </div>
          )}
          {selectedMetric && currentValues && currentValues.type === 'binary' && (
            <BarChart
              metric={currentValues}
              data={currentValues.values}
              stdError={stdError}
            />
          )}
          {selectedMetric && currentValues && currentValues.type === 'categorical' && (
            <StackedBarChart
              metric={currentValues}
              values={currentValues.values}
            />
          )}

          {selectedMetric && selectedCategory && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: `1px solid ${ui.color.border}`,
                display: 'flex',
                gap: 18,
                flexWrap: 'wrap',
                fontSize: 12,
                color: ui.color.textMuted,
              }}
            >
              <span>
                <strong style={{ color: ui.color.text }}>Category:</strong>{' '}
                {selectedCategory.label}
              </span>
              <span>
                <strong style={{ color: ui.color.text }}>Type:</strong>{' '}
                {selectedMetric.type === 'binary' ? 'Binary share' : 'Categorical distribution'}
              </span>
              <span>
                <strong style={{ color: ui.color.text }}>Segments:</strong>{' '}
                {SEGMENT_ORDER.join(' · ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
