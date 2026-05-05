import * as React from 'react';
import { useState } from 'react';
import { ui } from '../theme';
import { SEGMENTS, STATES, hashShare } from '../data';
import { Card } from '../components/Card';

type Granularity = 'state' | 'district';

function MapPlaceholder({ granularity, segment }: { granularity: Granularity; segment: string }) {
  // Lightweight SVG placeholder. Production wiring will load india-districts.geojson
  // (already in the repo root) and render a proper choropleth via d3-geo.
  const cells = granularity === 'state' ? 36 : 144;
  const cols = granularity === 'state' ? 6 : 12;
  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 4,
        background: ui.color.surfaceMuted,
        padding: 10,
        borderRadius: 8,
      }}>
        {Array.from({ length: cells }).map((_, i) => {
          const intensity = (hashShare(`${segment}-${granularity}-${i}`) % 90) + 10;
          return (
            <div key={i} style={{
              aspectRatio: '1 / 1',
              background: `rgba(29, 78, 216, ${intensity / 100})`,
              borderRadius: 2,
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11, color: ui.color.textMuted }}>
        <span>Low</span>
        <div style={{
          flex: 1, height: 6, borderRadius: 3,
          background: 'linear-gradient(90deg, rgba(29,78,216,0.1), rgba(29,78,216,1))',
        }} />
        <span>High</span>
      </div>
    </div>
  );
}

export function PrevalenceMapView() {
  const [granularity, setGranularity] = useState<Granularity>('state');
  const [segment, setSegment] = useState('Aspirers');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
          Prevalence map
        </h1>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>
          Choropleth of segment share across India. Toggle state vs district granularity.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex',
          background: ui.color.surface,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 999,
          padding: 3,
        }}>
          {(['state', 'district'] as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                background: granularity === g ? ui.color.text : 'transparent',
                color: granularity === g ? '#fff' : ui.color.textMuted,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {g}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: ui.color.textMuted }}>
          Segment
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            style={{
              padding: '6px 10px', fontSize: 13, border: `1px solid ${ui.color.border}`,
              borderRadius: 6, background: ui.color.surface, color: ui.color.text,
            }}
          >
            {SEGMENTS.map((s) => <option key={s.segment} value={s.segment}>{s.segment}</option>)}
          </select>
        </label>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: ui.color.textMuted }}>
          Dummy data — district-level wiring uses <code>india-districts.geojson</code>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card title={`India — ${segment} share by ${granularity}`}>
          <MapPlaceholder granularity={granularity} segment={segment} />
        </Card>

        <Card title="Top regions" subtitle={`Highest ${segment} share`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {STATES.slice(0, 8).map((name) => {
              const score = (hashShare(name + segment + granularity) % 35) + 10;
              return (
                <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 50px', alignItems: 'center', gap: 8 }}>
                  <span>{name}</span>
                  <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${(score / 45) * 100}%`, height: '100%', background: '#1d4ed8', borderRadius: 4 }} />
                  </div>
                  <span style={{ textAlign: 'right', color: ui.color.textMuted }}>{score}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
