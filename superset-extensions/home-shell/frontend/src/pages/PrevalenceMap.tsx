import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ui } from '../theme';
import { Card } from '../components/Card';
import { api, useFetch } from '../api';

// India-districts GeoJSON is served by Superset alongside the
// state_district_pies plugin (see assets/charts/district_pie_unified.yaml).
// Properties of interest: NAME_1 (state), NAME_2 (district).
const GEOJSON_URL = '/static/assets/india-districts.geojson';

const TARGET_STATES = ['Bihar', 'Madhya Pradesh', 'Jharkhand'] as const;
type StateName = (typeof TARGET_STATES)[number];

const SEGMENT_CODES = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'] as const;
type SegmentCode = (typeof SEGMENT_CODES)[number];

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

function fillForShare(share: number, max: number): string {
  const intensity = Math.min(1, Math.max(0.08, share / Math.max(max, 1)));
  return `rgba(29, 78, 216, ${intensity})`;
}

function StateMap({
  features,
  state,
  segment,
  shareByDistrict,
  width,
  height,
  onClick,
}: {
  features: GeoFeature[];
  state: StateName;
  segment: SegmentCode;
  shareByDistrict: Record<string, number>;
  width: number;
  height: number;
  onClick?: () => void;
}) {
  const max = useMemo(
    () => Math.max(0, ...Object.values(shareByDistrict)),
    [shareByDistrict],
  );
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
      aria-label={`${state} ${segment} share`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'block' }}
    >
      {paths.map((p, i) => {
        const share = shareByDistrict[p.name] ?? 0;
        return (
          <path
            key={i}
            d={p.d}
            fill={fillForShare(share, max)}
            stroke="#fff"
            strokeWidth={0.4}
          >
            <title>{`${p.name} — ${segment}: ${share.toFixed(1)}%`}</title>
          </path>
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
  shareByDistrict,
  width,
  height,
  selectedDistrict,
  onDistrictClick,
}: {
  features: GeoFeature[];
  state: StateName;
  segment: SegmentCode;
  shareByDistrict: Record<string, number>;
  width: number;
  height: number;
  selectedDistrict: string | null;
  onDistrictClick: (d: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = useMemo(
    () => Math.max(0, ...Object.values(shareByDistrict)),
    [shareByDistrict],
  );
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
        const share = shareByDistrict[p.name] ?? 0;
        const isSelected = selectedDistrict === p.name;
        const isHover = hover === p.name;
        return (
          <path
            key={i}
            d={p.d}
            fill={fillForShare(share, max)}
            stroke={isSelected ? '#0f172a' : '#fff'}
            strokeWidth={isSelected ? 2 : isHover ? 1.2 : 0.5}
            style={{ cursor: 'pointer' }}
            onClick={() => onDistrictClick(p.name)}
            onMouseEnter={() => setHover(p.name)}
            onMouseLeave={() => setHover((h) => (h === p.name ? null : h))}
          >
            <title>{`${p.name} — ${segment}: ${share.toFixed(1)}%`}</title>
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
  shareByDistrict,
  stateShare,
  onClick,
}: {
  state: StateName;
  segment: SegmentCode;
  features: GeoFeature[];
  shareByDistrict: Record<string, number>;
  stateShare: number | undefined;
  onClick: () => void;
}) {
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
        <span style={{ fontSize: 12, color: ui.color.textMuted }}>
          {stateShare == null ? '—' : `${stateShare.toFixed(1)}% ${segment}`}
        </span>
      </div>
      <StateMap
        features={features}
        state={state}
        segment={segment}
        shareByDistrict={shareByDistrict}
        width={260}
        height={220}
      />
      <span style={{ fontSize: 11, color: ui.color.textMuted }}>Click to drill into districts →</span>
    </div>
  );
}

export function PrevalenceMapView() {
  const [segment, setSegment] = useState<SegmentCode>('R1');
  const drill = useDrillDown();
  const geo = useGeo();
  const stateSegments = useFetch(() => api.statesSegments([...TARGET_STATES]), []);

  // Fetch districts for the focus states up front so the state cards on the
  // first level can shade by real district shares for the chosen segment.
  // Three small queries in parallel; results are stable across segment toggles.
  const districtsBihar = useFetch(() => api.stateDistricts('Bihar'), []);
  const districtsMP = useFetch(() => api.stateDistricts('Madhya Pradesh'), []);
  const districtsJharkhand = useFetch(() => api.stateDistricts('Jharkhand'), []);
  const districtsByState: Record<StateName, Awaited<ReturnType<typeof api.stateDistricts>> | undefined> = {
    Bihar: districtsBihar.data,
    'Madhya Pradesh': districtsMP.data,
    Jharkhand: districtsJharkhand.data,
  };

  const districtDetail = useFetch(
    () =>
      drill.selectedState && drill.selectedDistrict
        ? api.districtDetail(drill.selectedState, drill.selectedDistrict)
        : Promise.resolve(undefined as never),
    [drill.selectedState, drill.selectedDistrict],
  );

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

  const stateShareByCode = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const row of stateSegments.data?.states ?? []) {
      const inner: Record<string, number> = {};
      for (const seg of row.segments) inner[seg.segment] = seg.share_pct;
      out[row.state] = inner;
    }
    return out;
  }, [stateSegments.data]);

  function shareMapForState(state: StateName, seg: SegmentCode): Record<string, number> {
    const payload = districtsByState[state];
    if (!payload) return {};
    const out: Record<string, number> = {};
    for (const d of payload.districts) {
      const match = d.segments.find((s) => s.segment === seg);
      out[d.district] = match ? match.share_pct : 0;
    }
    return out;
  }

  const fetchError =
    geo.error ?? stateSegments.error ?? districtsBihar.error ?? districtsMP.error ?? districtsJharkhand.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
          Prevalence map
        </h1>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13 }}>
          LCA segment share across Bihar, Madhya Pradesh and Jharkhand. Districts shaded by
          weighted household share for the selected segment (vw_state_district_segment_geo).
          Click a state to drill into its districts.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Breadcrumbs drill={drill} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: ui.color.textMuted, marginLeft: 'auto' }}>
          Segment
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as SegmentCode)}
            style={{
              padding: '6px 10px',
              fontSize: 13,
              border: `1px solid ${ui.color.border}`,
              borderRadius: 6,
              background: ui.color.surface,
              color: ui.color.text,
            }}
          >
            {SEGMENT_CODES.map((s) => (
              <option key={s} value={s}>
                {s} {s.startsWith('R') ? '(Rural)' : '(Urban)'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {fetchError && (
        <div style={{ padding: 12, border: `1px solid ${ui.color.border}`, borderRadius: 8, color: '#b00020', fontSize: 12 }}>
          Could not load segmentation data: {fetchError.message}
        </div>
      )}

      {geo.loading && (
        <div style={{ padding: 24, color: ui.color.textMuted, fontSize: 13 }}>Loading map…</div>
      )}

      {!geo.loading && !geo.error && drill.level === 'states' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {TARGET_STATES.map((s) => (
            <StateCard
              key={s}
              state={s}
              segment={segment}
              features={featuresByState[s] ?? []}
              shareByDistrict={shareMapForState(s, segment)}
              stateShare={stateShareByCode[s]?.[segment]}
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
              shareByDistrict={shareMapForState(drill.selectedState, segment)}
              width={620}
              height={460}
              selectedDistrict={null}
              onDistrictClick={drill.onDistrictClick}
            />
            <IntensityLegend />
          </Card>

          <Card title="Top districts" subtitle={`Highest ${segment} share`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, maxHeight: 460, overflowY: 'auto' }}>
              {(districtsByState[drill.selectedState]?.districts ?? [])
                .map((d) => ({
                  name: d.district,
                  score: d.segments.find((s) => s.segment === segment)?.share_pct ?? 0,
                }))
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
                      <div style={{ width: `${Math.min(100, score)}%`, height: '100%', background: '#1d4ed8', borderRadius: 4 }} />
                    </div>
                    <span style={{ textAlign: 'right', color: ui.color.textMuted }}>
                      {score.toFixed(1)}%
                    </span>
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
              shareByDistrict={shareMapForState(drill.selectedState, segment)}
              width={420}
              height={320}
              selectedDistrict={drill.selectedDistrict}
              onDistrictClick={() => undefined}
            />
            <div style={{ marginTop: 10, fontSize: 36, fontWeight: 700, color: ui.color.text }}>
              {(() => {
                const seg = districtDetail.data?.segments?.find((s) => s.segment === segment);
                return seg ? `${seg.share_pct.toFixed(1)}%` : '—';
              })()}
            </div>
            <p style={{ marginTop: 6, fontSize: 12, color: ui.color.textMuted }}>
              Sourced live from <code>household.vw_state_district_segment_geo</code> via the
              home-shell backend (<code>/extensions/my-org/home-shell/states/{drill.selectedState}/districts/{drill.selectedDistrict}</code>).
            </p>
          </Card>

          <Card title="Segment mix" subtitle={`${drill.selectedDistrict} households (weighted)`}>
            {districtDetail.loading ? (
              <div style={{ fontSize: 12, color: ui.color.textMuted }}>Loading…</div>
            ) : districtDetail.error ? (
              <div style={{ fontSize: 12, color: '#b00020' }}>{districtDetail.error.message}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                {(districtDetail.data?.segments ?? []).map((s) => (
                  <div
                    key={s.segment}
                    style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px', alignItems: 'center', gap: 8 }}
                  >
                    <strong>{s.segment}</strong>
                    <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 6 }}>
                      <div
                        style={{
                          width: `${Math.min(100, s.share_pct)}%`,
                          height: '100%',
                          background: '#1d4ed8',
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <span style={{ textAlign: 'right', color: ui.color.textMuted }}>
                      {s.share_pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
