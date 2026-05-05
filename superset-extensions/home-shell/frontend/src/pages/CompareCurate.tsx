import * as React from 'react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { NoteList } from '../components/NoteList';

export function CompareCurateView() {
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
