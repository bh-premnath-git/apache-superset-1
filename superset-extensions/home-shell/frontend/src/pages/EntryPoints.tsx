import * as React from 'react';
import { ui } from '../theme';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { NoteList } from '../components/NoteList';

export function EntryPointsView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Entry points"
        lede="Set context before showing insights. First-time users should land on facts, not conclusions."
      />

      <Card title="What a first-time user should see first">
        <NoteList items={[
          { kind: 'planned', title: 'Base data sources',
            body: 'Name the underlying surveys/datasets that feed the model so users know what they are looking at.' },
          { kind: 'planned', title: 'Collection timeline',
            body: 'When the data was collected and over what period — required to read prevalence numbers correctly.' },
          { kind: 'planned', title: 'Methodology summary',
            body: 'How segments are derived (latent-class on consumption) in plain language, before any chart appears.' },
          { kind: 'planned', title: 'Facts before insights',
            body: 'Lead with descriptive numbers (households, districts, segments). Save interpretation for later screens.' },
        ]} />
      </Card>

      <Card title="Why this matters" subtitle="Avoiding misreads">
        <p style={{ margin: 0, fontSize: 13, color: ui.color.textMuted, lineHeight: 1.6 }}>
          Users currently land on a map without knowing what is being measured, when, or for which states the model is
          validated. The entry-point work fixes that by treating the first screen as orientation, not analytics.
        </p>
      </Card>
    </div>
  );
}
