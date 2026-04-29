import React, { memo, useMemo } from 'react';

import { METRIC_GROUP_COLORS, METRIC_GROUP_LABELS } from '../constants';
import type { MetricDefinition } from '../constants';
import type { MetricsRow } from '../hooks/useDetailMetrics';

export interface DetailMetricsTableProps {
  /** Title shown above the table (e.g. "Rural — All Segments"). */
  title: string;
  definitions: MetricDefinition[];
  /** Pre-fetched per-segment rows from `useDetailMetrics`. */
  rows: MetricsRow[];
  /** Show only segments matching this list (in this order). Empty = show all. */
  segmentOrder: string[];
  /** Optional human-friendly label per segment code. */
  segmentLabelFor?: (segment: string) => string;
  /** Optional click handler for the segment label cell. */
  onSegmentClick?: (segment: string) => void;
  /** Color resolver shared with the rest of the plugin. */
  colorFor: (category: string) => string;
}

/**
 * Wide per-segment metrics table grouped by metric category.
 *
 * Visually mirrors the deleted `rural_segment_comparison.yaml` handlebars
 * table: a coloured category header band on top, a clean column header
 * row beneath, then one row per segment carrying numeric value + thin
 * proportional bar (where the metric is bounded 0–100).
 */
function DetailMetricsTableImpl({
  title,
  definitions,
  rows,
  segmentOrder,
  segmentLabelFor,
  onSegmentClick,
  colorFor,
}: DetailMetricsTableProps) {
  const grouped = useMemo(() => groupColumns(definitions), [definitions]);
  const orderedRows = useMemo(
    () => orderRowsBy(rows, segmentOrder),
    [rows, segmentOrder],
  );

  if (definitions.length === 0) return null;

  const columnCount = definitions.length + 1;

  return (
    <section style={{ marginBottom: 18 }} aria-label={title}>
      <header style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#222' }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
          Per-segment metrics for the selected district
        </div>
      </header>

      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            color: '#222',
            tableLayout: 'auto',
            minWidth: Math.max(640, columnCount * 80),
          }}
        >
          <colgroup>
            <col style={{ minWidth: 110 }} />
            {definitions.map((d, i) => (
              <col key={`col-${i}-${d.label}`} style={{ minWidth: 80 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                rowSpan={2}
                style={{
                  ...thBand,
                  background: '#f5f6f8',
                  color: '#4a4a4a',
                  borderBottom: '1px solid #e2e4e8',
                  textAlign: 'left',
                }}
              >
                Segment
              </th>
              {grouped.bands.map(band => (
                <th
                  key={band.group}
                  scope="colgroup"
                  colSpan={band.span}
                  style={{
                    ...thBand,
                    background: METRIC_GROUP_COLORS[band.group],
                    color: '#fff',
                    borderRight: '2px solid #fff',
                  }}
                >
                  {METRIC_GROUP_LABELS[band.group]}
                </th>
              ))}
            </tr>
            <tr>
              {definitions.map((d, i) => (
                <th
                  key={`label-${i}-${d.label}`}
                  scope="col"
                  style={{
                    ...thLabel,
                    color: '#4a4a4a',
                  }}
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  style={{
                    padding: 12,
                    color: '#999',
                    fontStyle: 'italic',
                    textAlign: 'center',
                  }}
                >
                  No metrics returned for the selected segments.
                </td>
              </tr>
            ) : (
              orderedRows.map(row => (
                <tr key={row.segment} style={{ borderBottom: '1px solid #edeef1' }}>
                  <th scope="row" style={tdLeft}>
                    <SegmentChip
                      code={row.segment}
                      label={segmentLabelFor?.(row.segment)}
                      onClick={onSegmentClick}
                      color={colorFor(row.segment)}
                    />
                  </th>
                  {definitions.map((d, i) => (
                    <td key={`v-${i}-${d.label}`} style={tdNum}>
                      <ValueCell
                        value={row.values[d.label] ?? null}
                        format={d.format}
                        group={d.group}
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface ColumnBand {
  group: MetricDefinition['group'];
  span: number;
}

function groupColumns(definitions: MetricDefinition[]): { bands: ColumnBand[] } {
  const bands: ColumnBand[] = [];
  for (const d of definitions) {
    const last = bands[bands.length - 1];
    if (last && last.group === d.group) {
      last.span += 1;
    } else {
      bands.push({ group: d.group, span: 1 });
    }
  }
  return { bands };
}

function orderRowsBy(rows: MetricsRow[], order: string[]): MetricsRow[] {
  if (order.length === 0) return rows;
  const orderIndex = new Map(order.map((s, i) => [s, i]));
  return [...rows]
    .filter(r => orderIndex.has(r.segment))
    .sort(
      (a, b) =>
        (orderIndex.get(a.segment) ?? 0) - (orderIndex.get(b.segment) ?? 0),
    );
}

function SegmentChip({
  code,
  label,
  color,
  onClick,
}: {
  code: string;
  label?: string;
  color: string;
  onClick?: (segment: string) => void;
}) {
  const showSecondary = Boolean(label && label !== code);
  const interactive = Boolean(onClick);
  const content = (
    <>
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
          display: 'inline-block',
        }}
      />
      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontWeight: 600 }}>{label ?? code}</span>
        {showSecondary && <span style={{ fontSize: 11, color: '#7a7a7a' }}>{code}</span>}
      </span>
    </>
  );
  if (!interactive) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onClick?.(code)}
      aria-label={`Open ${(label ?? code)} segment description`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '2px 8px',
        background: 'transparent',
        border: '1px dashed transparent',
        borderRadius: 4,
        cursor: 'pointer',
        font: 'inherit',
        color: 'inherit',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#c4c8cf';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
      }}
    >
      {content}
    </button>
  );
}

function ValueCell({
  value,
  format,
  group,
}: {
  value: number | null;
  format: MetricDefinition['format'];
  group: MetricDefinition['group'];
}) {
  if (value == null) {
    return <span style={{ color: '#bbb' }}>—</span>;
  }
  const display =
    format === 'percent'
      ? `${value.toFixed(1)}%`
      : format === 'rupee'
        ? `₹${Math.round(value).toLocaleString()}`
        : value.toLocaleString();
  // Only render proportional bar for percent metrics, where the value is
  // bounded 0–100 and a bar is meaningful.
  const showBar = format === 'percent' && Number.isFinite(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {display}
      </span>
      {showBar && (
        <div
          role="progressbar"
          aria-valuenow={Math.max(0, Math.min(100, Math.round(value)))}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            width: '100%',
            maxWidth: 64,
            height: 4,
            background: '#eceef2',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, value))}%`,
              height: '100%',
              background: METRIC_GROUP_COLORS[group],
              borderRadius: 2,
            }}
          />
        </div>
      )}
    </div>
  );
}

const thBand: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'center',
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};
const thLabel: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'center',
  fontWeight: 500,
  fontSize: 11,
  background: '#f5f6f8',
  borderBottom: '1px solid #e2e4e8',
};
const tdLeft: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: 500,
};
const tdNum: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
};

export const DetailMetricsTable = memo(DetailMetricsTableImpl);
