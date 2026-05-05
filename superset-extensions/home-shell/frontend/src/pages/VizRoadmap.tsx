import * as React from 'react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { NoteList } from '../components/NoteList';

export function VizRoadmapView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Visualization roadmap"
        lede="Layout and disclosure changes that reduce cognitive load on every screen."
      />

      <Card title="Layout">
        <NoteList items={[
          { kind: 'planned', title: 'Horizontal segment layout',
            body: 'Lay segments out left-to-right rather than stacked vertically — easier to scan share-of-population at a glance.' },
        ]} />
      </Card>

      <Card title="Multi-level viewing">
        <NoteList items={[
          { kind: 'planned', title: 'Three-state → state → district',
            body: 'A consistent drill path so users always know which level they are at and how to step up or down.' },
          { kind: 'planned', title: 'Progressive disclosure',
            body: 'Show summary first, detail on demand. Avoid putting every breakdown on one screen.' },
        ]} />
      </Card>
    </div>
  );
}
