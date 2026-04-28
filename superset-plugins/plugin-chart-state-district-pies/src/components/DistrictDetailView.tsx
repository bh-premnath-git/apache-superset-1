import React, { memo, useMemo } from 'react';

import { SegmentComparisonTable } from './SegmentComparisonTable';
import { splitWedges } from '../data/splitWedges';
import { formatNumber, formatPercent } from '../format';
import type { DistrictRow } from '../types';

export interface DistrictDetailViewProps {
  row: DistrictRow;
  width: number;
  height: number;
  colorFor: (category: string) => string;
  ruralCategories: string[];
  urbanCategories: string[];
}

const RURAL_ACCENT = '#1f8f5c';
const URBAN_ACCENT = '#1565d8';

/**
 * District detail page — opened by clicking a district pie.
 *
 * Renders side-by-side rural and urban segment comparison tables so an
 * analyst can read counts, intra-section share, and share-of-district at
 * a glance. Mirrors the visual contract of the dashboard "Rural Segments
 * Comparison" handlebars table while staying schema-agnostic — which
 * codes count as "rural"/"urban" come from the chart's control panel.
 */
function DistrictDetailViewImpl({
  row,
  width,
  height,
  colorFor,
  ruralCategories,
  urbanCategories,
}: DistrictDetailViewProps) {
  const { rural, urban, otherTotal } = useMemo(
    () => splitWedges(row, ruralCategories, urbanCategories),
    [row, ruralCategories, urbanCategories],
  );

  const ruralTotal = rural.reduce((s, w) => s + w.value, 0);
  const urbanTotal = urban.reduce((s, w) => s + w.value, 0);
  const grandTotal = ruralTotal + urbanTotal + otherTotal;

  const showSideBySide = width >= 640;

  return (
    <div
      className="sdp-detail"
      style={{
        position: 'relative',
        width,
        height,
        padding: 16,
        boxSizing: 'border-box',
        overflowY: 'auto',
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#222',
        background: '#fff',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 14,
          borderBottom: '1px solid #e2e4e8',
          paddingBottom: 10,
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {row.districtKey}
            <span style={{ color: '#888', fontWeight: 500 }}> · {row.stateKey}</span>
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            <strong>{formatNumber(grandTotal)}</strong> households · Rural{' '}
            {formatPercent(ruralTotal, grandTotal)} · Urban{' '}
            {formatPercent(urbanTotal, grandTotal)}
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showSideBySide ? '1fr 1fr' : '1fr',
          gap: 16,
        }}
      >
        <SegmentComparisonTable
          title="Rural Segments"
          accentColor={RURAL_ACCENT}
          wedges={rural}
          districtTotal={grandTotal}
          colorFor={colorFor}
        />
        <SegmentComparisonTable
          title="Urban Segments"
          accentColor={URBAN_ACCENT}
          wedges={urban}
          districtTotal={grandTotal}
          colorFor={colorFor}
        />
      </div>

      {otherTotal > 0 && (
        <div
          role="note"
          style={{ marginTop: 4, fontSize: 11, color: '#888' }}
        >
          {formatNumber(otherTotal)} household
          {otherTotal === 1 ? '' : 's'} fall outside the configured rural and
          urban groups.
        </div>
      )}
    </div>
  );
}

export const DistrictDetailView = memo(DistrictDetailViewImpl);
