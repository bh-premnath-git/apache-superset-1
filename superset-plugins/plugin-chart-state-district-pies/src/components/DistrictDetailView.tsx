import React, { memo, useCallback, useMemo, useState } from 'react';

import { DetailMetricsTable } from './DetailMetricsTable';
import { SegmentComparisonTable } from './SegmentComparisonTable';
import { SegmentModal } from './SegmentModal';
import { lookupSegmentDescription } from '../data/segmentDescriptions';
import { splitWedges } from '../data/splitWedges';
import { formatNumber, formatPercent } from '../format';
import { useDetailMetrics } from '../hooks/useDetailMetrics';
import type { MetricDefinition, SegmentDescription } from '../constants';
import type { DistrictRow } from '../types';

export interface DistrictDetailViewProps {
  row: DistrictRow;
  width: number;
  height: number;
  colorFor: (category: string) => string;
  ruralCategories: string[];
  urbanCategories: string[];

  metricsDatasourceId?: number;
  metricsStateColumn: string;
  metricsDistrictColumn: string;
  metricsSegmentColumn: string;
  metricsDefinitions: MetricDefinition[];
  segmentDescriptions: Record<string, SegmentDescription>;
}

const RURAL_ACCENT = '#1f8f5c';
const URBAN_ACCENT = '#1565d8';

/**
 * District detail page — opened by clicking a district pie.
 *
 * Layout, top to bottom:
 *   1. Header (district + state + totals).
 *   2. Rural segment comparison table.
 *   3. Urban segment comparison table.
 *   4. Optional rich per-segment metrics table fetched from the configured
 *      metrics dataset (skipped when `metricsDatasourceId` is undefined).
 *
 * Clicking a segment label opens `SegmentModal` with the operator-supplied
 * description text.
 */
function DistrictDetailViewImpl({
  row,
  width,
  height,
  colorFor,
  ruralCategories,
  urbanCategories,
  metricsDatasourceId,
  metricsStateColumn,
  metricsDistrictColumn,
  metricsSegmentColumn,
  metricsDefinitions,
  segmentDescriptions,
}: DistrictDetailViewProps) {
  const { rural, urban, otherTotal } = useMemo(
    () => splitWedges(row, ruralCategories, urbanCategories),
    [row, ruralCategories, urbanCategories],
  );

  const ruralTotal = rural.reduce((s, w) => s + w.value, 0);
  const urbanTotal = urban.reduce((s, w) => s + w.value, 0);
  const grandTotal = ruralTotal + urbanTotal + otherTotal;

  const metrics = useDetailMetrics({
    datasourceId: metricsDatasourceId,
    stateColumn: metricsStateColumn,
    districtColumn: metricsDistrictColumn,
    segmentColumn: metricsSegmentColumn,
    state: row.stateKey,
    district: row.districtKey,
    definitions: metricsDefinitions,
  });

  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const onSegmentClick = useCallback(
    (code: string) => setSelectedSegment(code),
    [],
  );
  const onCloseModal = useCallback(() => setSelectedSegment(null), []);
  const segmentLabelFor = useCallback(
    (code: string) => lookupSegmentDescription(segmentDescriptions, code).title,
    [segmentDescriptions],
  );

  const richEnabled =
    metricsDatasourceId !== undefined && metricsDefinitions.length > 0;
  const showBasicTables = !richEnabled || Boolean(metrics.error);

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {showBasicTables && (
          <>
            <SegmentComparisonTable
              title="Rural Segments"
              accentColor={RURAL_ACCENT}
              wedges={rural}
              districtTotal={grandTotal}
              colorFor={colorFor}
              segmentLabelFor={segmentLabelFor}
              onSegmentClick={onSegmentClick}
            />
            <SegmentComparisonTable
              title="Urban Segments"
              accentColor={URBAN_ACCENT}
              wedges={urban}
              districtTotal={grandTotal}
              colorFor={colorFor}
              segmentLabelFor={segmentLabelFor}
              onSegmentClick={onSegmentClick}
            />
          </>
        )}

        {richEnabled && (
          <RichMetricsSection
            state={metrics}
            definitions={metricsDefinitions}
            ruralOrder={ruralCategories}
            urbanOrder={urbanCategories}
            segmentLabelFor={segmentLabelFor}
            onSegmentClick={onSegmentClick}
            colorFor={colorFor}
          />
        )}

        {otherTotal > 0 && (
          <div
            role="note"
            style={{ marginTop: -6, fontSize: 11, color: '#888' }}
          >
            {formatNumber(otherTotal)} household
            {otherTotal === 1 ? '' : 's'} fall outside the configured rural and
            urban groups.
          </div>
        )}
      </div>

      {selectedSegment && (
        <SegmentModal
          segment={selectedSegment}
          description={lookupSegmentDescription(segmentDescriptions, selectedSegment)}
          swatchColor={colorFor(selectedSegment)}
          onClose={onCloseModal}
        />
      )}
    </div>
  );
}

interface RichMetricsSectionProps {
  state: ReturnType<typeof useDetailMetrics>;
  definitions: MetricDefinition[];
  ruralOrder: string[];
  urbanOrder: string[];
  segmentLabelFor: (segment: string) => string;
  onSegmentClick: (segment: string) => void;
  colorFor: (category: string) => string;
}

function RichMetricsSection({
  state,
  definitions,
  ruralOrder,
  urbanOrder,
  segmentLabelFor,
  onSegmentClick,
  colorFor,
}: RichMetricsSectionProps) {
  if (state.loading) {
    return (
      <div
        role="status"
        style={{
          padding: 12,
          fontSize: 12,
          color: '#666',
          background: '#f9fafb',
          borderRadius: 6,
        }}
      >
        Loading per-segment metrics…
      </div>
    );
  }
  if (state.error) {
    return (
      <div
        role="alert"
        style={{
          padding: 12,
          fontSize: 12,
          color: '#b00020',
          background: '#fdecea',
          borderRadius: 6,
        }}
      >
        Could not load detail metrics: {state.error.message}
      </div>
    );
  }
  if (state.rows.length === 0) {
    return (
      <div
        role="note"
        style={{ padding: 12, fontSize: 12, color: '#888', background: '#f9fafb', borderRadius: 6 }}
      >
        No detail metrics returned for this district.
      </div>
    );
  }
  return (
    <>
      <DetailMetricsTable
        title="Rural — All Segments"
        definitions={definitions}
        rows={state.rows}
        segmentOrder={ruralOrder}
        segmentLabelFor={segmentLabelFor}
        onSegmentClick={onSegmentClick}
        colorFor={colorFor}
      />
      <DetailMetricsTable
        title="Urban — All Segments"
        definitions={definitions}
        rows={state.rows}
        segmentOrder={urbanOrder}
        segmentLabelFor={segmentLabelFor}
        onSegmentClick={onSegmentClick}
        colorFor={colorFor}
      />
    </>
  );
}

export const DistrictDetailView = memo(DistrictDetailViewImpl);
