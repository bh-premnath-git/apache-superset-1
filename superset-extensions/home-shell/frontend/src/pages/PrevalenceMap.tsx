import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ui } from '../theme';
import { SEGMENTS, hashShare } from '../data';
import { Card } from '../components/Card';

// The three target states sourced from the same dataset the
// `state_district_pies` plugin reads (household.vw_state_segment_distribution).
// Districts are placeholder names — production wiring will pull the district
// list from `india-districts.geojson` (NAME_1 / NAME_2 properties).
const TARGET_STATES = ['Bihar', 'Madhya Pradesh', 'Jharkhand'] as const;
type StateName = (typeof TARGET_STATES)[number];

const DISTRICTS_BY_STATE: Record<StateName, string[]> = {
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Saran', 'Begusarai'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa', 'Satna'],
  Jharkhand: ['Ranchi', 'Dhanbad', 'Jamshedpur', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Dumka'],
};

type DrillLevel = 'states' | 'districts' | 'detail';

interface DrillState {
  level: DrillLevel;
  selectedState: StateName | null;
  selectedDistrict: string | null;
  goToStates: () => void;
  goToDistricts: () => void;
  onStateClick: (s: StateName) => void;
  onDistrictClick: (d: string) => void;
}

// Mirrors `useDrillDown` from plugin-chart-state-district-pies, scoped to the
// three-state cohort: states -> districts -> detail.
function useDrillDown(): DrillState {
  const [level, setLevel] = useState<DrillLevel>('states');
  const [selectedState, setSelectedState] = useState<StateName | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const goToStates = useCallback(() => {
    setLevel('states');
    setSelectedState(null);
    setSelectedDistrict(null);
  }, []);

  const goToDistricts = useCallback(() => {
    setLevel('districts');
    setSelectedDistrict(null);
  }, []);

  const onStateClick = useCallback((s: StateName) => {
    setSelectedState(s);
    setLevel('districts');
  }, []);

  const onDistrictClick = useCallback((d: string) => {
    setSelectedDistrict(d);
    setLevel('detail');
  }, []);

  return {
    level,
    selectedState,
    selectedDistrict,
    goToStates,
    goToDistricts,
    onStateClick,
    onDistrictClick,
  };
}

function ChoroplethGrid({
  cols,
  cells,
  seed,
  height = undefined,
}: {
  cols: number;
  cells: number;
  seed: string;
  height?: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 3,
        background: ui.color.surfaceMuted,
        padding: 8,
        borderRadius: 8,
        height,
      }}
    >
      {Array.from({ length: cells }).map((_, i) => {
        const intensity = (hashShare(`${seed}-${i}`) % 90) + 10;
        return (
          <div
            key={i}
            style={{
              aspectRatio: '1 / 1',
              background: `rgba(29, 78, 216, ${intensity / 100})`,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

function IntensityLegend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11, color: ui.color.textMuted }}>
      <span>Low</span>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: 'linear-gradient(90deg, rgba(29,78,216,0.1), rgba(29,78,216,1))',
        }}
      />
      <span>High</span>
    </div>
  );
}

function Breadcrumbs({ drill }: { drill: DrillState }) {
  const crumbStyle = (clickable: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 12,
    fontWeight: 600,
    color: clickable ? ui.color.textMuted : ui.color.text,
    cursor: clickable ? 'pointer' : 'default',
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <button type="button" onClick={drill.goToStates} style={crumbStyle(drill.level !== 'states')}>
        States
      </button>
      {drill.selectedState && (
        <>
          <span style={{ color: ui.color.textMuted }}>›</span>
          <button
            type="button"
            onClick={drill.goToDistricts}
            style={crumbStyle(drill.level === 'detail')}
          >
            {drill.selectedState}
          </button>
        </>
      )}
      {drill.selectedDistrict && (
        <>
          <span style={{ color: ui.color.textMuted }}>›</span>
          <span style={crumbStyle(false)}>{drill.selectedDistrict}</span>
        </>
      )}
    </div>
  );
}

function StateCard({
  state,
  segment,
  onClick,
}: {
  state: StateName;
  segment: string;
  onClick: () => void;
}) {
  const share = (hashShare(state + segment) % 35) + 10;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: ui.color.text }}>{state}</span>
        <span style={{ fontSize: 12, color: ui.color.textMuted }}>{share}% {segment}</span>
      </div>
      <ChoroplethGrid cols={6} cells={36} seed={`${state}-${segment}`} />
      <span style={{ fontSize: 11, color: ui.color.textMuted }}>Click to drill into districts →</span>
    </button>
  );
}

export function PrevalenceMapView() {
  const [segment, setSegment] = useState('Aspirers');
  const drill = useDrillDown();

  const districts = useMemo(
    () => (drill.selectedState ? DISTRICTS_BY_STATE[drill.selectedState] : []),
    [drill.selectedState],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
          Prevalence map
        </h1>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>
          Segment share across Bihar, Madhya Pradesh and Jharkhand. Click a state to drill into its districts.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Breadcrumbs drill={drill} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: ui.color.textMuted, marginLeft: 'auto' }}>
          Segment
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: 13,
              border: `1px solid ${ui.color.border}`,
              borderRadius: 6,
              background: ui.color.surface,
              color: ui.color.text,
            }}
          >
            {SEGMENTS.map((s) => (
              <option key={s.segment} value={s.segment}>{s.segment}</option>
            ))}
          </select>
        </label>
      </div>

      {drill.level === 'states' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {TARGET_STATES.map((s) => (
            <StateCard key={s} state={s} segment={segment} onClick={() => drill.onStateClick(s)} />
          ))}
        </div>
      )}

      {drill.level === 'districts' && drill.selectedState && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Card title={`${drill.selectedState} — ${segment} share by district`}>
            <ChoroplethGrid
              cols={12}
              cells={144}
              seed={`${drill.selectedState}-${segment}-districts`}
            />
            <IntensityLegend />
          </Card>

          <Card title="Top districts" subtitle={`Highest ${segment} share`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              {districts.map((name) => {
                const score = (hashShare(name + segment) % 35) + 10;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => drill.onDistrictClick(name)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 60px 50px',
                      alignItems: 'center',
                      gap: 8,
                      background: 'none',
                      border: 'none',
                      padding: '4px 0',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: ui.color.text,
                    }}
                  >
                    <span>{name}</span>
                    <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${(score / 45) * 100}%`, height: '100%', background: '#1d4ed8', borderRadius: 4 }} />
                    </div>
                    <span style={{ textAlign: 'right', color: ui.color.textMuted }}>{score}%</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {drill.level === 'detail' && drill.selectedState && drill.selectedDistrict && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card title={`${drill.selectedDistrict}, ${drill.selectedState}`} subtitle={`${segment} share`}>
            <div style={{ fontSize: 36, fontWeight: 700, color: ui.color.text }}>
              {(hashShare(drill.selectedDistrict + segment) % 35) + 10}%
            </div>
            <p style={{ marginTop: 6, fontSize: 12, color: ui.color.textMuted }}>
              Detail metrics will be sourced from the same dataset the
              {' '}<code>state_district_pies</code> plugin reads
              (<code>household.vw_state_segment_distribution</code>).
            </p>
          </Card>

          <Card title="Segment mix" subtitle={`${drill.selectedDistrict} households`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              {SEGMENTS.map((s) => {
                const share = (hashShare(drill.selectedDistrict + s.segment) % 30) + 5;
                return (
                  <div key={s.segment} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 40px', alignItems: 'center', gap: 8 }}>
                    <span>{s.segment}</span>
                    <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${(share / 35) * 100}%`, height: '100%', background: '#1d4ed8', borderRadius: 4 }} />
                    </div>
                    <span style={{ textAlign: 'right', color: ui.color.textMuted }}>{share}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
