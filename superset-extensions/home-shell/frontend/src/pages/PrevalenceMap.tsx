import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ui } from '../theme';
import { SEGMENTS, hashShare } from '../data';
import { Card } from '../components/Card';

// India-districts GeoJSON is served by Superset alongside the
// state_district_pies plugin (see assets/charts/district_pie_unified.yaml).
// Properties of interest: NAME_1 (state), NAME_2 (district).
const GEOJSON_URL = '/static/assets/india-districts.geojson';

const TARGET_STATES = ['Bihar', 'Madhya Pradesh', 'Jharkhand'] as const;
type StateName = (typeof TARGET_STATES)[number];

interface GeoFeature {
  type: 'Feature';
  properties: { NAME_1?: string; NAME_2?: string; [k: string]: unknown };
  geometry: { type: string; coordinates: unknown };
}
interface GeoFC {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

// Module-level cache so the 32MB geojson is only fetched once per page load.
let GEO_CACHE: Promise<GeoFC> | null = null;
function loadGeo(): Promise<GeoFC> {
  if (!GEO_CACHE) {
    GEO_CACHE = fetch(GEOJSON_URL, { credentials: 'omit' }).then(async (r) => {
      if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status} ${r.statusText}`);
      return (await r.json()) as GeoFC;
    });
    GEO_CACHE.catch(() => {
      GEO_CACHE = null;
    });
  }
  return GEO_CACHE;
}

function useGeo(): { data?: GeoFC; error?: Error; loading: boolean } {
  const [state, setState] = useState<{ data?: GeoFC; error?: Error; loading: boolean }>({
    loading: true,
  });
  useEffect(() => {
    let cancelled = false;
    loadGeo()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ error, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

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

// Mirrors useDrillDown from plugin-chart-state-district-pies, scoped to the
// three-state cohort.
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

function fillForShare(share: number) {
  const intensity = Math.min(1, Math.max(0.1, share / 45));
  return `rgba(29, 78, 216, ${intensity})`;
}

function StateMap({
  features,
  state,
  segment,
  width,
  height,
  onClick,
}: {
  features: GeoFeature[];
  state: StateName;
  segment: string;
  width: number;
  height: number;
  onClick?: () => void;
}) {
  const { paths, outline } = useMemo(() => {
    const fc: GeoFC = { type: 'FeatureCollection', features };
    const projection = geoMercator().fitExtent(
      [
        [6, 6],
        [Math.max(width - 6, 7), Math.max(height - 6, 7)],
      ],
      fc as unknown as GeoJSON.FeatureCollection,
    );
    const pathGen = geoPath(projection);
    return {
      paths: features.map((f) => ({
        d: pathGen(f as unknown as GeoJSON.Feature) ?? '',
        name: String(f.properties.NAME_2 ?? ''),
      })),
      outline: pathGen(fc as unknown as GeoJSON.Feature) ?? '',
    };
  }, [features, width, height]);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`${state} districts`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'block' }}
    >
      {paths.map((p, i) => {
        const share = (hashShare(`${state}-${p.name}-${segment}`) % 35) + 10;
        return (
          <path
            key={i}
            d={p.d}
            fill={fillForShare(share)}
            stroke="#fff"
            strokeWidth={0.4}
          />
        );
      })}
      <path d={outline} fill="none" stroke="#1f2937" strokeWidth={1} pointerEvents="none" />
    </svg>
  );
}

function DistrictMap({
  features,
  state,
  segment,
  width,
  height,
  selectedDistrict,
  onDistrictClick,
}: {
  features: GeoFeature[];
  state: StateName;
  segment: string;
  width: number;
  height: number;
  selectedDistrict: string | null;
  onDistrictClick: (d: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const paths = useMemo(() => {
    const fc: GeoFC = { type: 'FeatureCollection', features };
    const projection = geoMercator().fitExtent(
      [
        [8, 8],
        [Math.max(width - 8, 9), Math.max(height - 8, 9)],
      ],
      fc as unknown as GeoJSON.FeatureCollection,
    );
    const pathGen = geoPath(projection);
    return features.map((f) => ({
      d: pathGen(f as unknown as GeoJSON.Feature) ?? '',
      name: String(f.properties.NAME_2 ?? ''),
    }));
  }, [features, width, height]);

  return (
    <svg width={width} height={height} role="img" aria-label={`${state} district map`} style={{ display: 'block' }}>
      {paths.map((p, i) => {
        const share = (hashShare(`${state}-${p.name}-${segment}`) % 35) + 10;
        const isSelected = selectedDistrict === p.name;
        const isHover = hover === p.name;
        return (
          <path
            key={i}
            d={p.d}
            fill={fillForShare(share)}
            stroke={isSelected ? '#0f172a' : '#fff'}
            strokeWidth={isSelected ? 2 : isHover ? 1.2 : 0.5}
            style={{ cursor: 'pointer' }}
            onClick={() => onDistrictClick(p.name)}
            onMouseEnter={() => setHover(p.name)}
            onMouseLeave={() => setHover((h) => (h === p.name ? null : h))}
          >
            <title>{`${p.name} — ${share}% ${segment}`}</title>
          </path>
        );
      })}
    </svg>
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
          <button type="button" onClick={drill.goToDistricts} style={crumbStyle(drill.level === 'detail')}>
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
  features,
  onClick,
}: {
  state: StateName;
  segment: string;
  features: GeoFeature[];
  onClick: () => void;
}) {
  const share = (hashShare(state + segment) % 35) + 10;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
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
      <StateMap features={features} state={state} segment={segment} width={260} height={220} />
      <span style={{ fontSize: 11, color: ui.color.textMuted }}>Click to drill into districts →</span>
    </div>
  );
}

export function PrevalenceMapView() {
  const [segment, setSegment] = useState('Aspirers');
  const drill = useDrillDown();
  const geo = useGeo();

  const featuresByState = useMemo(() => {
    const map: Record<string, GeoFeature[]> = {};
    if (!geo.data) return map;
    for (const f of geo.data.features) {
      const s = String(f.properties.NAME_1 ?? '');
      if ((TARGET_STATES as readonly string[]).includes(s)) {
        (map[s] ||= []).push(f);
      }
    }
    return map;
  }, [geo.data]);

  const districtNames = useMemo(() => {
    if (!drill.selectedState) return [];
    return (featuresByState[drill.selectedState] ?? [])
      .map((f) => String(f.properties.NAME_2 ?? ''))
      .filter(Boolean);
  }, [featuresByState, drill.selectedState]);

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

      {geo.loading && (
        <div style={{ padding: 24, color: ui.color.textMuted, fontSize: 13 }}>Loading map…</div>
      )}
      {geo.error && (
        <div style={{ padding: 16, color: '#b00020', fontSize: 13 }}>
          Failed to load map data: {geo.error.message}
        </div>
      )}

      {!geo.loading && !geo.error && drill.level === 'states' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {TARGET_STATES.map((s) => (
            <StateCard
              key={s}
              state={s}
              segment={segment}
              features={featuresByState[s] ?? []}
              onClick={() => drill.onStateClick(s)}
            />
          ))}
        </div>
      )}

      {!geo.loading && !geo.error && drill.level === 'districts' && drill.selectedState && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Card title={`${drill.selectedState} — ${segment} share by district`}>
            <DistrictMap
              features={featuresByState[drill.selectedState] ?? []}
              state={drill.selectedState}
              segment={segment}
              width={620}
              height={460}
              selectedDistrict={null}
              onDistrictClick={drill.onDistrictClick}
            />
            <IntensityLegend />
          </Card>

          <Card title="Top districts" subtitle={`Highest ${segment} share`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, maxHeight: 460, overflowY: 'auto' }}>
              {districtNames
                .map((name) => ({ name, score: (hashShare(name + segment) % 35) + 10 }))
                .sort((a, b) => b.score - a.score)
                .map(({ name, score }) => (
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
                ))}
            </div>
          </Card>
        </div>
      )}

      {!geo.loading && !geo.error && drill.level === 'detail' && drill.selectedState && drill.selectedDistrict && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card title={`${drill.selectedDistrict}, ${drill.selectedState}`} subtitle={`${segment} share`}>
            <DistrictMap
              features={(featuresByState[drill.selectedState] ?? []).filter(
                (f) => String(f.properties.NAME_2 ?? '') === drill.selectedDistrict,
              )}
              state={drill.selectedState}
              segment={segment}
              width={420}
              height={320}
              selectedDistrict={drill.selectedDistrict}
              onDistrictClick={() => undefined}
            />
            <div style={{ marginTop: 10, fontSize: 36, fontWeight: 700, color: ui.color.text }}>
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
