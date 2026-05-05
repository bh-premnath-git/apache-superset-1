import * as React from 'react';
import { ui, SEGMENT_PALETTE } from '../theme';
import { SEGMENTS } from '../data';
import { Card } from '../components/Card';
import { Kpi } from '../components/Kpi';
import { SegmentBars } from '../components/SegmentBars';

export function OverviewView() {
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
          <SegmentBars rows={SEGMENTS} palette={SEGMENT_PALETTE} />
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
