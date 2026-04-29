import React, { memo } from 'react';

import { formatNumber, formatPercent } from '../format';
import type { Wedge } from '../types';

export interface SegmentComparisonTableProps {
  /** Section heading shown above the table (e.g. "Rural Segments"). */
  title: string;
  /** Color used for the section heading + bar fills' default hue. */
  accentColor: string;
  /** Wedges that belong to this section, in display order. */
  wedges: Wedge[];
  /** Total weight across the *entire* district (rural + urban + other). */
  districtTotal: number;
  /** Color resolver shared with the rest of the plugin. */
  colorFor: (category: string) => string;
  /** Optional human-friendly label per segment code. */
  segmentLabelFor?: (segment: string) => string;
  /** Optional click handler for the segment label cell. */
  onSegmentClick?: (segment: string) => void;
}

/**
 * Per-section breakdown for the district detail page.
 *
 * Layout mirrors the "Rural Segments Comparison" handlebars table on the
 * dashboard: one row per segment carrying count, % within the section,
 * % of the whole district, and a thin proportional bar for at-a-glance
 * comparison. Renders as a real `<table>` for screen-reader friendliness.
 */
function SegmentComparisonTableImpl({
  title,
  accentColor,
  wedges,
  districtTotal,
  colorFor,
  segmentLabelFor,
  onSegmentClick,
}: SegmentComparisonTableProps) {
  const sectionTotal = wedges.reduce((s, w) => s + w.value, 0);
  const sectionShareOfDistrict = formatPercent(sectionTotal, districtTotal);

  return (
    <section
      className="sdp-segcmp"
      aria-label={title}
      style={{ marginBottom: 18 }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, color: accentColor }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: '#666' }}>
          {formatNumber(sectionTotal)} ({sectionShareOfDistrict} of district)
        </div>
      </header>

      {wedges.length === 0 ? (
        <div
          role="note"
          style={{ color: '#999', fontStyle: 'italic', fontSize: 12 }}
        >
          No data in this group for the selected district.
        </div>
      ) : (
        <table
          role="table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            color: '#222',
          }}
        >
          <caption className="sdp-sr-only" style={SR_ONLY}>
            {title} breakdown
          </caption>
          <thead>
            <tr style={{ background: '#f5f6f8' }}>
              <th scope="col" style={th('left', 80)}>
                Segment
              </th>
              <th scope="col" style={th('right', 80)}>
                Count
              </th>
              <th scope="col" style={th('right', 90)}>
                % of {title.split(' ')[0]}
              </th>
              <th scope="col" style={th('right', 90)}>
                % of district
              </th>
              <th scope="col" style={th('left')}>
                Distribution
              </th>
            </tr>
          </thead>
          <tbody>
            {wedges.map(w => {
              const sectionShare = formatPercent(w.value, sectionTotal);
              const districtShare = formatPercent(w.value, districtTotal);
              const sectionShareValue =
                sectionTotal > 0 ? (w.value / sectionTotal) * 100 : 0;
              const swatch = colorFor(w.category);
              return (
                <tr key={w.category} style={{ borderBottom: '1px solid #edeef1' }}>
                  <th scope="row" style={td('left')}>
                    <SegmentLabelCell
                      code={w.category}
                      label={segmentLabelFor?.(w.category)}
                      swatchColor={swatch}
                      onClick={onSegmentClick}
                    />
                  </th>
                  <td style={td('right')}>{formatNumber(w.value)}</td>
                  <td style={td('right')}>{sectionShare}</td>
                  <td style={td('right')}>{districtShare}</td>
                  <td style={td('left')}>
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(sectionShareValue)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${w.category} share of ${title}`}
                      style={{
                        height: 6,
                        background: '#eceef2',
                        borderRadius: 3,
                        overflow: 'hidden',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          width: `${sectionShareValue}%`,
                          height: '100%',
                          background: swatch,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SegmentLabelCell({
  code,
  label,
  swatchColor,
  onClick,
}: {
  code: string;
  label?: string;
  swatchColor: string;
  onClick?: (segment: string) => void;
}) {
  const showSecondary = Boolean(label && label !== code);
  const swatch = (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        background: swatchColor,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
        display: 'inline-block',
      }}
    />
  );
  if (!onClick) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {swatch}
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600 }}>{label ?? code}</span>
          {showSecondary && <span style={{ fontSize: 11, color: '#7a7a7a' }}>{code}</span>}
        </span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onClick(code)}
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
      {swatch}
      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontWeight: 600 }}>{label ?? code}</span>
        {showSecondary && <span style={{ fontSize: 11, color: '#7a7a7a' }}>{code}</span>}
      </span>
    </button>
  );
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

function th(
  align: 'left' | 'right',
  minWidth?: number,
): React.CSSProperties {
  return {
    textAlign: align,
    fontSize: 11,
    fontWeight: 500,
    color: '#4a4a4a',
    padding: '8px 10px',
    borderBottom: '1px solid #e2e4e8',
    minWidth,
  };
}

function td(align: 'left' | 'right'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '8px 10px',
    fontVariantNumeric: 'tabular-nums',
  };
}

export const SegmentComparisonTable = memo(SegmentComparisonTableImpl);
