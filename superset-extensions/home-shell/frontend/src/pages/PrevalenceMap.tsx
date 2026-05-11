import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ui } from '../theme';
import { api, useFetch, DistrictRow } from '../api';
import { SegmentCode, SEGMENT_CODES } from '../nav';
import { useCrmState } from '../crm';

// Screen 6 — Prevalence Map.
//
// District-level choropleth across Bihar, MP and Jharkhand. Two display
// modes:
//   • "Dominant segment" — each district shaded by its top CRM segment.
//   • Single-segment   — each district shaded by the prevalence % of the
//                       chosen segment (light → dark).
//
// Right-side panel is a sortable list of districts by the active metric.
// Clicking a district highlights it on the map and persists it to local
// storage so the Dashboard Home can surface it as "last viewed district".

const GEOJSON_URL = '/static/assets/india-districts.geojson';

const FOCUS_STATES = ['Bihar', 'Madhya Pradesh', 'Jharkhand'] as const;
type StateName = (typeof FOCUS_STATES)[number] | 'all';

const SEGMENT_COLOR: Record<SegmentCode, string> = {
  R1: '#fb923c',
  R2: '#60a5fa',
  R3: '#a855f7',
  R4: '#ef4444',
  U1: '#c4b5fd',
  U2: '#93c5fd',
  U3: '#4ade80',
};

const LAST_DISTRICT_KEY = 'crm.home.lastDistrict';

interface GeoFeature {
  type: 'Feature';
  properties: { NAME_1?: string; NAME_2?: string; [k: string]: unknown };
  geometry: { type: string; coordinates: unknown };
}
interface GeoFC {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

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

function useStateDistricts(state: string) {
  return useFetch(() => api.stateDistricts(state), [state]);
}

// Mix a base color with white to produce a lighter shade. t ∈ [0..1]; 0 = white, 1 = base.
function shade(hex: string, t: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const tt = Math.max(0, Math.min(1, t));
  const mix = (v: number) => Math.round(255 - (255 - v) * tt);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function dominant(district: DistrictRow): { code: SegmentCode; share: number } | null {
  let best: { code: SegmentCode; share: number } | null = null;
  for (const s of district.segments) {
    if (!(SEGMENT_CODES as readonly string[]).includes(s.segment)) continue;
    if (!best || s.share_pct > best.share) {
      best = { code: s.segment as SegmentCode, share: s.share_pct };
    }
  }
  return best;
}

function shareOf(district: DistrictRow, code: SegmentCode | null): number {
  if (!code) return 0;
  return district.segments.find((s) => s.segment === code)?.share_pct ?? 0;
}

function topN(district: DistrictRow, n = 3): { code: SegmentCode; share: number }[] {
  return district.segments
    .filter((s): s is typeof s & { segment: SegmentCode } =>
      (SEGMENT_CODES as readonly string[]).includes(s.segment),
    )
    .map((s) => ({ code: s.segment as SegmentCode, share: s.share_pct }))
    .sort((a, b) => b.share - a.share)
    .slice(0, n);
}

// ── Map ────────────────────────────────────────────────────────────────────

function ChoroplethMap({
  features,
  districts,
  selectedSegment,
  hovered,
  setHovered,
  onClick,
  width,
  height,
}: {
  features: GeoFeature[];
  districts: Map<string, DistrictRow>;
  selectedSegment: SegmentCode | null;
  hovered: string | null;
  setHovered: (d: string | null) => void;
  onClick: (state: string, district: string) => void;
  width: number;
  height: number;
}) {
  const { paths, maxShare } = useMemo(() => {
    if (features.length === 0) return { paths: [] as { d: string; state: string; district: string; fill: string }[], maxShare: 0 };
    const fc: GeoFC = { type: 'FeatureCollection', features };
    const projection = geoMercator().fitExtent(
      [
        [8, 8],
        [Math.max(width - 8, 9), Math.max(height - 8, 9)],
      ],
      fc as unknown as GeoJSON.FeatureCollection,
    );
    const pathGen = geoPath(projection);

    let maxS = 0;
    if (selectedSegment) {
      for (const r of districts.values()) {
        const s = shareOf(r, selectedSegment);
        if (s > maxS) maxS = s;
      }
    }

    const paths = features.map((f) => {
      const district = String(f.properties.NAME_2 ?? '');
      const state = String(f.properties.NAME_1 ?? '');
      const row = districts.get(district);
      let fill = '#e5e7eb';
      if (row) {
        if (selectedSegment) {
          const share = shareOf(row, selectedSegment);
          fill = maxS > 0 ? shade(SEGMENT_COLOR[selectedSegment], share / maxS) : '#e5e7eb';
        } else {
          const dom = dominant(row);
          fill = dom ? shade(SEGMENT_COLOR[dom.code], 0.85) : '#e5e7eb';
        }
      }
      return {
        d: pathGen(f as unknown as GeoJSON.Feature) ?? '',
        state,
        district,
        fill,
      };
    });
    return { paths, maxShare: maxS };
  }, [features, districts, selectedSegment, width, height]);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="District choropleth"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {paths.map((p, i) => {
        const isHover = hovered === p.district;
        return (
          <path
            key={`${p.district}-${i}`}
            d={p.d}
            fill={p.fill}
            stroke={isHover ? ui.color.text : '#ffffff'}
            strokeWidth={isHover ? 1.4 : 0.4}
            style={{ cursor: 'pointer' }}
            onClick={() => onClick(p.state, p.district)}
            onMouseEnter={() => setHovered(p.district)}
            onMouseLeave={() => setHovered(null)}
          >
            <title>
              {p.district}, {p.state}
            </title>
          </path>
        );
      })}
      {selectedSegment && maxShare > 0 && (
        <g transform={`translate(12, ${height - 32})`}>
          <text x={0} y={-6} fontSize={10} fill={ui.color.textMuted}>
            {selectedSegment} prevalence
          </text>
          <rect x={0} y={0} width={140} height={10}
            fill={`url(#grad-${selectedSegment})`} />
          <text x={0} y={22} fontSize={10} fill={ui.color.textMuted}>0%</text>
          <text x={140} y={22} fontSize={10} fill={ui.color.textMuted} textAnchor="end">
            {maxShare.toFixed(0)}%
          </text>
          <defs>
            <linearGradient id={`grad-${selectedSegment}`}>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor={SEGMENT_COLOR[selectedSegment]} />
            </linearGradient>
          </defs>
        </g>
      )}
    </svg>
  );
}

// ── District list ──────────────────────────────────────────────────────────

type SortKey = 'name' | 'metric' | 'total';

function DistrictList({
  districts,
  selectedSegment,
  hovered,
  setHovered,
  onClick,
  showState,
}: {
  districts: { state: string; row: DistrictRow }[];
  selectedSegment: SegmentCode | null;
  hovered: string | null;
  setHovered: (d: string | null) => void;
  onClick: (state: string, district: string) => void;
  showState: boolean;
}) {
  const [sort, setSort] = useState<SortKey>('metric');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const arr = [...districts];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sort === 'name') cmp = a.row.district.localeCompare(b.row.district);
      else if (sort === 'total') cmp = (a.row.total_weight ?? 0) - (b.row.total_weight ?? 0);
      else {
        // metric
        const av = selectedSegment ? shareOf(a.row, selectedSegment) : (dominant(a.row)?.share ?? 0);
        const bv = selectedSegment ? shareOf(b.row, selectedSegment) : (dominant(b.row)?.share ?? 0);
        cmp = av - bv;
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [districts, sort, dir, selectedSegment]);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(k);
      setDir(k === 'name' ? 'asc' : 'desc');
    }
  };

  const sortGlyph = (k: SortKey) => (sort === k ? (dir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showState ? '1fr 60px 90px 60px' : '1fr 90px 60px',
          gap: 8,
          padding: '8px 12px',
          background: ui.color.surfaceMuted,
          borderBottom: `1px solid ${ui.color.border}`,
          fontSize: 11,
          fontWeight: 700,
          color: ui.color.textMuted,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        <button type="button" onClick={() => toggleSort('name')} style={sortBtn}>
          District{sortGlyph('name')}
        </button>
        {showState && <span>State</span>}
        <button type="button" onClick={() => toggleSort('metric')} style={{ ...sortBtn, textAlign: 'right' }}>
          {selectedSegment ? `${selectedSegment} %` : 'Top seg'}
          {sortGlyph('metric')}
        </button>
        <button type="button" onClick={() => toggleSort('total')} style={{ ...sortBtn, textAlign: 'right' }}>
          HH wt{sortGlyph('total')}
        </button>
      </div>
      <div style={{ overflow: 'auto', flex: 1 }}>
        {sorted.map(({ state, row }) => {
          const dom = dominant(row);
          const top3 = topN(row, 3);
          const isHover = hovered === row.district;
          const metricVal = selectedSegment ? shareOf(row, selectedSegment) : dom?.share ?? 0;
          return (
            <div
              key={`${state}-${row.district}`}
              onMouseEnter={() => setHovered(row.district)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onClick(state, row.district)}
              style={{
                display: 'grid',
                gridTemplateColumns: showState ? '1fr 60px 90px 60px' : '1fr 90px 60px',
                gap: 8,
                padding: '8px 12px',
                fontSize: 12,
                color: ui.color.text,
                cursor: 'pointer',
                background: isHover ? ui.color.surfaceMuted : 'transparent',
                borderBottom: `1px solid ${ui.color.border}`,
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.district}
                </strong>
                <span style={{ fontSize: 10, color: ui.color.textMuted, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {top3.map((t) => (
                    <span
                      key={t.code}
                      style={{
                        padding: '0 4px',
                        borderRadius: 4,
                        background: shade(SEGMENT_COLOR[t.code], 0.25),
                        color: ui.color.text,
                        fontWeight: 600,
                      }}
                    >
                      {t.code} {t.share.toFixed(0)}%
                    </span>
                  ))}
                </span>
              </div>
              {showState && (
                <span style={{ fontSize: 10, color: ui.color.textMuted }}>
                  {state.slice(0, 3).toUpperCase()}
                </span>
              )}
              <span style={{ textAlign: 'right', fontWeight: 700 }}>
                {selectedSegment
                  ? `${metricVal.toFixed(1)}%`
                  : dom
                    ? `${dom.code} · ${dom.share.toFixed(0)}%`
                    : '—'}
              </span>
              <span style={{ textAlign: 'right', fontSize: 10, color: ui.color.textMuted }}>
                {row.total_weight
                  ? `${(row.total_weight / 1_000_000).toFixed(1)}M`
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const sortBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontSize: 11,
  fontWeight: 700,
  color: ui.color.textMuted,
  cursor: 'pointer',
  textAlign: 'left',
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  fontFamily: ui.font,
};

// ── Page ───────────────────────────────────────────────────────────────────

function downloadCsv(rows: { state: string; district: string; segment: string; share_pct: number }[]) {
  const header = 'state,district,segment,share_pct';
  const lines = rows.map(
    (r) => `${JSON.stringify(r.state)},${JSON.stringify(r.district)},${r.segment},${r.share_pct.toFixed(2)}`,
  );
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prevalence-districts.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PrevalenceMapView() {
  const geo = useGeo();
  const crmState = useCrmState();
  const crm = crmState.data;
  const [stateFilter, setStateFilter] = useState<StateName>('Bihar');
  const [selectedSegment, setSelectedSegment] = useState<SegmentCode | null>(null); // null = dominant
  const [hovered, setHovered] = useState<string | null>(null);

  // Fetch district data per focus state and combine. When stateFilter is
  // 'all', all three load in parallel.
  const bihar = useFetch(() => api.stateDistricts('Bihar'), []);
  const mp = useFetch(() => api.stateDistricts('Madhya Pradesh'), []);
  const jh = useFetch(() => api.stateDistricts('Jharkhand'), []);

  const allDistricts: { state: string; row: DistrictRow }[] = useMemo(() => {
    const out: { state: string; row: DistrictRow }[] = [];
    for (const r of bihar.data?.districts ?? []) out.push({ state: 'Bihar', row: r });
    for (const r of mp.data?.districts ?? []) out.push({ state: 'Madhya Pradesh', row: r });
    for (const r of jh.data?.districts ?? []) out.push({ state: 'Jharkhand', row: r });
    return out;
  }, [bihar.data, mp.data, jh.data]);

  const visibleDistricts = useMemo(
    () => (stateFilter === 'all' ? allDistricts : allDistricts.filter((d) => d.state === stateFilter)),
    [allDistricts, stateFilter],
  );

  const districtMap = useMemo(() => {
    const m = new Map<string, DistrictRow>();
    for (const d of visibleDistricts) m.set(d.row.district, d.row);
    return m;
  }, [visibleDistricts]);

  const allFeatures = geo.data?.features ?? [];
  const visibleFeatures = useMemo(() => {
    if (stateFilter === 'all') {
      return allFeatures.filter((f) =>
        (FOCUS_STATES as readonly string[]).includes(String(f.properties.NAME_1 ?? '')),
      );
    }
    return allFeatures.filter((f) => String(f.properties.NAME_1 ?? '') === stateFilter);
  }, [allFeatures, stateFilter]);

  const onDistrictClick = (state: string, district: string) => {
    try {
      localStorage.setItem(LAST_DISTRICT_KEY, JSON.stringify({ state, district }));
    } catch {
      /* ignore */
    }
  };

  const downloadRows = useMemo(() => {
    const out: { state: string; district: string; segment: string; share_pct: number }[] = [];
    for (const { state, row } of visibleDistricts) {
      for (const s of row.segments) {
        if (selectedSegment && s.segment !== selectedSegment) continue;
        out.push({ state, district: row.district, segment: s.segment, share_pct: s.share_pct });
      }
    }
    return out;
  }, [visibleDistricts, selectedSegment]);

  const fetchError = geo.error ?? bihar.error ?? mp.error ?? jh.error;
  const loading = geo.loading || bihar.loading || mp.loading || jh.loading;

  const hoveredRow = hovered ? districtMap.get(hovered) : undefined;
  const hoveredState = hovered
    ? visibleDistricts.find((d) => d.row.district === hovered)?.state ?? ''
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: ui.color.text }}>
            Prevalence map
          </h1>
          <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13, maxWidth: 720 }}>
            District-level concentration of CRM segments across Bihar, MP and Jharkhand. Pick a
            single segment to see only its prevalence, or stay in <em>Dominant segment</em> mode
            to see which segment leads in each district.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(downloadRows)}
          style={{
            padding: '8px 14px',
            border: `1px solid ${ui.color.border}`,
            borderRadius: 6,
            background: ui.color.surface,
            color: ui.color.text,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Download CSV
        </button>
      </div>

      {fetchError && (
        <div
          style={{
            padding: 12,
            border: `1px solid ${ui.color.border}`,
            borderRadius: 8,
            color: '#b00020',
            fontSize: 12,
            background: '#fff5f5',
          }}
        >
          Could not load prevalence data: {fetchError.message}
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          padding: '12px 14px',
          background: ui.color.surface,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: ui.color.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            State
          </span>
          <div style={{ display: 'inline-flex', border: `1px solid ${ui.color.border}`, borderRadius: 6, overflow: 'hidden' }}>
            {(['all', ...FOCUS_STATES] as StateName[]).map((s, i) => {
              const active = s === stateFilter;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStateFilter(s)}
                  style={{
                    padding: '6px 12px',
                    background: active ? ui.color.surfaceMuted : ui.color.surface,
                    color: active ? ui.color.text : ui.color.chipText,
                    border: 'none',
                    borderLeft: i === 0 ? 'none' : `1px solid ${ui.color.border}`,
                    fontFamily: ui.font,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {s === 'all' ? 'All 3 states' : s}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: ui.color.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Show
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <button
              type="button"
              onClick={() => setSelectedSegment(null)}
              style={{
                padding: '6px 12px',
                border: `1px solid ${selectedSegment === null ? ui.color.text : ui.color.border}`,
                borderRadius: 999,
                background: selectedSegment === null ? ui.color.text : ui.color.surface,
                color: selectedSegment === null ? ui.color.surface : ui.color.text,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: ui.font,
                cursor: 'pointer',
              }}
            >
              Dominant segment
            </button>
            {SEGMENT_CODES.map((c) => {
              const active = selectedSegment === c;
              const brief = crm?.segmentByCode.get(c);
              const badgeBg = brief?.tier_badge_bg ?? ui.color.surfaceMuted;
              const badgeColor = brief?.tier_badge_color ?? ui.color.text;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedSegment(active ? null : c)}
                  title={brief?.name ?? c}
                  style={{
                    padding: '6px 12px',
                    border: `1px solid ${active ? badgeColor : ui.color.border}`,
                    borderRadius: 999,
                    background: active ? badgeBg : ui.color.surface,
                    color: active ? badgeColor : ui.color.text,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    fontFamily: ui.font,
                    cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two-column body: map + district list */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* Map column */}
        <div
          style={{
            border: `1px solid ${ui.color.border}`,
            borderRadius: 10,
            background: ui.color.surface,
            position: 'relative',
            minHeight: 460,
            padding: 12,
          }}
        >
          {loading && (
            <div style={{ padding: 20, color: ui.color.textMuted, fontSize: 12 }}>Loading map…</div>
          )}
          {!loading && (
            <ChoroplethMap
              features={visibleFeatures}
              districts={districtMap}
              selectedSegment={selectedSegment}
              hovered={hovered}
              setHovered={setHovered}
              onClick={onDistrictClick}
              width={560}
              height={460}
            />
          )}

          {/* Tooltip overlay */}
          {hoveredRow && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: ui.color.text,
                color: ui.color.surface,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.5,
                boxShadow: '0 6px 18px rgba(15,23,42,0.25)',
                maxWidth: 240,
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              <strong style={{ fontSize: 13, display: 'block' }}>{hoveredRow.district}</strong>
              <span style={{ opacity: 0.7 }}>{hoveredState}</span>
              {selectedSegment && (
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{selectedSegment} prevalence</span>
                  <strong>{shareOf(hoveredRow, selectedSegment).toFixed(1)}%</strong>
                </div>
              )}
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                <div style={{ fontWeight: 700 }}>Top 3 segments</div>
                {topN(hoveredRow, 3).map((t) => (
                  <div key={t.code} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      {t.code}
                      {crm?.segmentByCode.get(t.code)
                        ? ` · ${crm.segmentByCode.get(t.code)!.name.split('—')[0].trim()}`
                        : ''}
                    </span>
                    <span>{t.share.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* District list */}
        <div
          style={{
            border: `1px solid ${ui.color.border}`,
            borderRadius: 10,
            background: ui.color.surface,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 460,
            maxHeight: 600,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${ui.color.border}`,
              fontSize: 13,
              fontWeight: 700,
              color: ui.color.text,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>
              Districts ({visibleDistricts.length})
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: ui.color.textMuted }}>
              {selectedSegment ? `Sorted by ${selectedSegment} %` : 'Sorted by dominant share'}
            </span>
          </div>
          {loading ? (
            <div style={{ padding: 20, color: ui.color.textMuted, fontSize: 12 }}>Loading…</div>
          ) : (
            <DistrictList
              districts={visibleDistricts}
              selectedSegment={selectedSegment}
              hovered={hovered}
              setHovered={setHovered}
              onClick={onDistrictClick}
              showState={stateFilter === 'all'}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          padding: 14,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 10,
          background: ui.color.surface,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          fontSize: 12,
          color: ui.color.text,
        }}
      >
        <strong>Segment colors</strong>
        {SEGMENT_CODES.map((c) => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                background: SEGMENT_COLOR[c],
                borderRadius: 2,
                display: 'inline-block',
              }}
            />
            {c}
            {crm?.segmentByCode.get(c)
              ? ` · ${crm.segmentByCode.get(c)!.name.split('—')[0].trim()}`
              : ''}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: ui.color.textMuted }}>
          Layer overlays (SRLM coverage / MFI density) — Phase 2
        </span>
      </div>
    </div>
  );
}
