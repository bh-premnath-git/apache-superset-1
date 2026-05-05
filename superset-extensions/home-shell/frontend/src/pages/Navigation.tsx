import * as React from 'react';
import { ui } from '../theme';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';

export function NavigationView() {
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
