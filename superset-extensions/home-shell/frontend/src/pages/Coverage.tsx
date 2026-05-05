import * as React from 'react';
import { Card } from '../components/Card';
import { Kpi } from '../components/Kpi';
import { PageHeader } from '../components/PageHeader';
import { NoteList } from '../components/NoteList';

export function CoverageView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Coverage & status"
        lede="Where the dashboard stands today: scope of validated analysis, data caveats, and active fixes."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <Kpi label="Validated states" value="3" hint="Bihar · Jharkhand · Madhya Pradesh" />
        <Kpi label="Underlying coverage" value="All-India" hint="Methodology not yet validated outside the 3 states" />
        <Kpi label="Segmentation type" value="Composite" hint="Across the 3 states, not per-state" />
      </div>

      <Card title="Validated scope" subtitle="What the current segmentation actually covers">
        <NoteList items={[
          { kind: 'live',   title: 'Three-state composite segmentation',
            body: 'Bihar, Jharkhand and Madhya Pradesh are the only states whose segmentation has been methodologically validated.' },
          { kind: 'caveat', title: 'Underlying data exists for all of India',
            body: 'Raw inputs cover every state, but applying the current model outside the validated three is not supported yet.' },
          { kind: 'caveat', title: 'Composite, not state-level',
            body: 'Segments are derived across the three states together; the dashboard does not yet expose a per-state model.' },
        ]} />
      </Card>

      <Card title="Active fixes" subtitle="Visualization issues being corrected">
        <NoteList items={[
          { kind: 'in-progress', title: 'Pie chart sizing',
            body: 'Pies render too small; resizing pass underway so segment slices are legible without zooming.' },
          { kind: 'in-progress', title: 'Icon and literal display',
            body: 'A few icons and string literals are rendering incorrectly; cleanup in progress.' },
          { kind: 'in-progress', title: 'Larger circle visualizations',
            body: 'Bumping circle/marker sizes so the prevalence layer is readable at typical screen widths.' },
          { kind: 'in-progress', title: 'Interactive features',
            body: 'Drill, hover, and selection behaviours are being wired up across the existing charts.' },
        ]} />
      </Card>
    </div>
  );
}
