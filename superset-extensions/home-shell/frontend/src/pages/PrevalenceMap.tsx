import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ui } from '../theme';
import { api, useFetch } from '../api';

// India-districts GeoJSON is served by Superset alongside the
// state_district_pies plugin (see assets/charts/district_pie_unified.yaml).
// Properties of interest: NAME_1 (state), NAME_2 (district).
const GEOJSON_URL = '/static/assets/india-districts.geojson';

const TARGET_STATES = ['Bihar', 'Madhya Pradesh', 'Jharkhand'] as const;
type StateName = (typeof TARGET_STATES)[number];

// LCA segments. Rural = R1..R4; Urban = U1..U3.
const URBAN_SEGMENTS = ['U1', 'U2', 'U3'] as const;
const RURAL_SEGMENTS = ['R1', 'R2', 'R3', 'R4'] as const;
type SegmentCode = (typeof URBAN_SEGMENTS)[number] | (typeof RURAL_SEGMENTS)[number];

// Pathways-inspired palette: urban in greens/blues/lavenders, rural in
// blue / purple / red. Order is the display order inside each sector group.
const SEGMENT_META: Record<SegmentCode, { label: string; color: string; sector: 'Urban' | 'Rural' }> = {
  U1: { label: 'U1 · Connected urban',        color: '#4ade80', sector: 'Urban' },
  U2: { label: 'U2 · Digitally engaged urban', color: '#93c5fd', sector: 'Urban' },
  U3: { label: 'U3 · Most constrained urban',  color: '#c4b5fd', sector: 'Urban' },
  R1: { label: 'R1 · Connected rural',         color: '#fb923c', sector: 'Rural' },
  R2: { label: 'R2 · Digitally engaged rural', color: '#60a5fa', sector: 'Rural' },
  R3: { label: 'R3 · Low-connectivity rural',  color: '#a855f7', sector: 'Rural' },
  R4: { label: 'R4 · Most constrained rural',  color: '#ef4444', sector: 'Rural' },
};

const SECTOR_STRIPE = {
  Urban: '#9ca3af',
  Rural: '#f59e0b',
};

interface GeoFeature {
  type: 'Feature';
  properties: { NAME_1?: string; NAME_2?: string; [k: string]: unknown };
  geometry: { type: string; coordinates: unknown };
}
interface GeoFC {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

// Module-level cache so the geojson is only fetched once per page load.
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

// ─── India state map (left column) ──────────────────────────────────────────

function IndiaMap({
  features,
  selected,
  onToggle,
  width,
  height,
  zoom,
}: {
  features: GeoFeature[];
  selected: Set<StateName>;
  onToggle: (s: StateName) => void;
  width: number;
  height: number;
  zoom: number;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const { paths } = useMemo(() => {
    const fc: GeoFC = { type: 'FeatureCollection', features };
    const projection = geoMercator().fitExtent(
      [
        [8, 8],
        [Math.max(width - 8, 9), Math.max(height - 8, 9)],
      ],
      fc as unknown as GeoJSON.FeatureCollection,
    );
    const pathGen = geoPath(projection);
    return {
      paths: features.map((f) => ({
        d: pathGen(f as unknown as GeoJSON.Feature) ?? '',
        state: String(f.properties.NAME_1 ?? ''),
        district: String(f.properties.NAME_2 ?? ''),
      })),
    };
  }, [features, width, height]);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="India focus states"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      <g transform={`translate(${(width * (1 - zoom)) / 2}, ${(height * (1 - zoom)) / 2}) scale(${zoom})`}>
        {paths.map((p, i) => {
          const isFocus = (TARGET_STATES as readonly string[]).includes(p.state);
          const isSelected = isFocus && selected.has(p.state as StateName);
          const isHover = hover === p.state;
          const fill = !isFocus
            ? '#e5e7eb'
            : isSelected
              ? '#94a3b8'
              : isHover
                ? '#cbd5e1'
                : '#dbeafe';
          return (
            <path
              key={i}
              d={p.d}
              fill={fill}
              stroke="#fff"
              strokeWidth={0.4}
              style={{ cursor: isFocus ? 'pointer' : 'default' }}
              onClick={() => isFocus && onToggle(p.state as StateName)}
              onMouseEnter={() => isFocus && setHover(p.state)}
              onMouseLeave={() => setHover((h) => (h === p.state ? null : h))}
            >
              <title>
                {p.state}
                {p.district ? ` · ${p.district}` : ''}
                {isFocus ? (isSelected ? ' (selected)' : ' (click to select)') : ''}
              </title>
            </path>
          );
        })}
      </g>
    </svg>
  );
}

// ─── Stacked horizontal bar per state ───────────────────────────────────────

function ScaleAxis() {
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  return (
    <div
      style={{
        position: 'relative',
        height: 22,
        marginBottom: 6,
        marginLeft: 110,
        marginRight: 12,
      }}
    >
      {ticks.map((t) => (
        <span
          key={t}
          style={{
            position: 'absolute',
            left: `${t}%`,
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: ui.color.textMuted,
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function GridLines() {
  const ticks = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  return (
    <>
      {ticks.map((t) => (
        <div
          key={t}
          style={{
            position: 'absolute',
            top: 6,
            bottom: 6,
            left: `${t}%`,
            width: 0,
            borderLeft: `1px dashed ${ui.color.border}`,
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

function StackedBarRow({
  state,
  segments,
  sector,
}: {
  state: string;
  segments: { segment: string; share_pct: number }[];
  sector: 'both' | 'urban' | 'rural';
}) {
  const urban = segments.filter((s) => SEGMENT_META[s.segment as SegmentCode]?.sector === 'Urban');
  const rural = segments.filter((s) => SEGMENT_META[s.segment as SegmentCode]?.sector === 'Rural');
  const urbanTotal = urban.reduce((a, b) => a + b.share_pct, 0);
  const ruralTotal = rural.reduce((a, b) => a + b.share_pct, 0);

  // Apply sector filter: keep only one group, re-normalizing visually by
  // hiding the other. The bar width still reflects 0..100 of the chosen
  // sector's share of the population to keep cross-state comparisons honest.
  const showUrban = sector !== 'rural';
  const showRural = sector !== 'urban';

  const orderedUrban = [...URBAN_SEGMENTS]
    .map((k) => urban.find((s) => s.segment === k))
    .filter((s): s is { segment: string; share_pct: number } => !!s);
  const orderedRural = [...RURAL_SEGMENTS]
    .map((k) => rural.find((s) => s.segment === k))
    .filter((s): s is { segment: string; share_pct: number } => !!s);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr',
        alignItems: 'center',
        gap: 0,
        padding: '10px 0',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: ui.color.text,
          paddingRight: 8,
          textAlign: 'right',
        }}
      >
        {state}
      </div>
      <div style={{ position: 'relative', height: 36, paddingRight: 12 }}>
        <GridLines />
        {/* Sector stripes (urban left, rural right) */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 0,
            height: 4,
            display: 'flex',
            width: '100%',
          }}
        >
          {showUrban && (
            <div style={{ width: `${urbanTotal}%`, background: SECTOR_STRIPE.Urban }} />
          )}
          {showRural && (
            <div style={{ width: `${ruralTotal}%`, background: SECTOR_STRIPE.Rural }} />
          )}
        </div>
        {/* Stacked segment row */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            bottom: 4,
            left: 0,
            display: 'flex',
            width: '100%',
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${ui.color.surface}`,
          }}
        >
          {showUrban &&
            orderedUrban.map((s) => {
              const meta = SEGMENT_META[s.segment as SegmentCode];
              if (!meta || s.share_pct <= 0) return null;
              return (
                <div
                  key={s.segment}
                  title={`${meta.label} · ${s.share_pct.toFixed(1)}%`}
                  style={{
                    width: `${s.share_pct}%`,
                    background: meta.color,
                  }}
                />
              );
            })}
          {showRural &&
            orderedRural.map((s) => {
              const meta = SEGMENT_META[s.segment as SegmentCode];
              if (!meta || s.share_pct <= 0) return null;
              return (
                <div
                  key={s.segment}
                  title={`${meta.label} · ${s.share_pct.toFixed(1)}%`}
                  style={{
                    width: `${s.share_pct}%`,
                    background: meta.color,
                  }}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── Donut version ──────────────────────────────────────────────────────────

function DonutChart({
  state,
  segments,
  sector,
}: {
  state: string;
  segments: { segment: string; share_pct: number }[];
  sector: 'both' | 'urban' | 'rural';
}) {
  const filtered = segments.filter((s) => {
    const meta = SEGMENT_META[s.segment as SegmentCode];
    if (!meta) return false;
    if (sector === 'urban') return meta.sector === 'Urban';
    if (sector === 'rural') return meta.sector === 'Rural';
    return true;
  });

  const total = filtered.reduce((a, b) => a + b.share_pct, 0) || 1;
  const size = 140;
  const r = 60;
  const rInner = 38;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;

  const arcs = filtered.map((s) => {
    const meta = SEGMENT_META[s.segment as SegmentCode]!;
    const start = (acc / total) * 2 * Math.PI;
    acc += s.share_pct;
    const end = (acc / total) * 2 * Math.PI;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.sin(start);
    const y1 = cy - r * Math.cos(start);
    const x2 = cx + r * Math.sin(end);
    const y2 = cy - r * Math.cos(end);
    const xi2 = cx + rInner * Math.sin(end);
    const yi2 = cy - rInner * Math.cos(end);
    const xi1 = cx + rInner * Math.sin(start);
    const yi1 = cy - rInner * Math.cos(start);
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${rInner} ${rInner} 0 ${large} 0 ${xi1} ${yi1} Z`;
    return { d, color: meta.color, key: s.segment, title: `${meta.label} · ${s.share_pct.toFixed(1)}%` };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12 }}>
      <svg width={size} height={size} role="img" aria-label={`${state} segment mix`}>
        {arcs.map((a) => (
          <path key={a.key} d={a.d} fill={a.color}>
            <title>{a.title}</title>
          </path>
        ))}
      </svg>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: ui.color.text }}>
        {state}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

function downloadCsv(rows: { state: string; segment: string; share_pct: number }[]) {
  const header = 'state,segment,share_pct';
  const lines = rows.map((r) => `${JSON.stringify(r.state)},${r.segment},${r.share_pct.toFixed(2)}`);
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prevalence-map.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PrevalenceMapView() {
  const geo = useGeo();
  const stateSegments = useFetch(() => api.statesSegments([...TARGET_STATES]), []);

  const [selected, setSelected] = useState<Set<StateName>>(() => new Set(TARGET_STATES));
  const [sector, setSector] = useState<'both' | 'urban' | 'rural'>('both');
  const [view, setView] = useState<'bar' | 'donut'>('bar');
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);

  const allFeatures = geo.data?.features ?? [];

  const toggleState = (s: StateName) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(TARGET_STATES));
  const resetZoom = () => setZoom(1);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return [...TARGET_STATES];
    const q = search.trim().toLowerCase();
    return TARGET_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [search]);

  // Show all selected states that match the search filter.
  const visibleStates = useMemo(
    () => searchFiltered.filter((s) => selected.has(s)),
    [searchFiltered, selected],
  );

  const stateRows = useMemo(() => {
    const byState: Record<string, { segment: string; share_pct: number }[]> = {};
    for (const row of stateSegments.data?.states ?? []) {
      byState[row.state] = row.segments.map((s) => ({
        segment: s.segment,
        share_pct: s.share_pct,
      }));
    }
    return byState;
  }, [stateSegments.data]);

  const downloadRows = useMemo(() => {
    const out: { state: string; segment: string; share_pct: number }[] = [];
    for (const s of visibleStates) {
      for (const seg of stateRows[s] ?? []) {
        const meta = SEGMENT_META[seg.segment as SegmentCode];
        if (!meta) continue;
        if (sector === 'urban' && meta.sector !== 'Urban') continue;
        if (sector === 'rural' && meta.sector !== 'Rural') continue;
        out.push({ state: s, segment: seg.segment, share_pct: seg.share_pct });
      }
    }
    return out;
  }, [visibleStates, stateRows, sector]);

  const fetchError = geo.error ?? stateSegments.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: ui.color.text }}>
            Prevalence map
          </h1>
          <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13, maxWidth: 720 }}>
            Compare the prevalence of LCA segments across the three focus states.
            Select one or more states on the map below or search for a specific area.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            border: `1px solid ${ui.color.border}`,
            borderRadius: 6,
            background: ui.color.surface,
            color: ui.color.text,
            cursor: 'pointer',
            fontSize: 13,
          }}
          title="Copy this page URL to your clipboard"
        >
          Share this view ↗
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

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: 16,
        }}
      >
        {/* Left column: search + map */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${ui.color.border}`,
            borderRadius: 10,
            background: ui.color.surface,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: `1px solid ${ui.color.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: ui.color.textMuted,
                  fontSize: 14,
                }}
              >
                ⌕
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search geographic areas"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 30px',
                  fontSize: 13,
                  border: `1px solid ${ui.color.border}`,
                  borderRadius: 6,
                  background: ui.color.surface,
                  color: ui.color.text,
                  fontFamily: ui.font,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ position: 'relative', flex: 1, padding: 12 }}>
            <button
              type="button"
              onClick={selectAll}
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                padding: '6px 12px',
                border: `1px solid ${ui.color.border}`,
                borderRadius: 6,
                background: ui.color.surface,
                color: ui.color.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              Select all
            </button>
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                zIndex: 2,
              }}
            >
              <button type="button" onClick={() => setZoom((z) => Math.min(3, z * 1.25))} style={mapBtnStyle}>
                +
              </button>
              <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} style={mapBtnStyle}>
                −
              </button>
              <button type="button" onClick={resetZoom} style={mapBtnStyle} title="Reset zoom">
                ⟳
              </button>
            </div>

            {geo.loading && (
              <div style={{ padding: 24, color: ui.color.textMuted, fontSize: 13 }}>
                Loading map…
              </div>
            )}
            {!geo.loading && !geo.error && (
              <IndiaMap
                features={allFeatures}
                selected={selected}
                onToggle={toggleState}
                width={336}
                height={360}
                zoom={zoom}
              />
            )}

            {/* Selected chips */}
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                fontSize: 11,
                color: ui.color.textMuted,
              }}
            >
              {[...selected].map((s) => (
                <span
                  key={s}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    border: `1px solid ${ui.color.border}`,
                    borderRadius: 999,
                    color: ui.color.text,
                    background: ui.color.surfaceMuted,
                    fontWeight: 600,
                  }}
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => toggleState(s)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: ui.color.textMuted,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {selected.size === 0 && <span>No states selected</span>}
            </div>
          </div>
        </div>

        {/* Right column: toolbar + chart */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${ui.color.border}`,
            borderRadius: 10,
            background: ui.color.surface,
            overflow: 'hidden',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              padding: 12,
              borderBottom: `1px solid ${ui.color.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                border: `1px solid ${ui.color.border}`,
                borderRadius: 8,
                overflow: 'hidden',
                background: ui.color.surfaceMuted,
              }}
            >
              {(['both', 'urban', 'rural'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSector(s)}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    background: sector === s ? ui.color.surface : 'transparent',
                    color: ui.color.text,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: sector === s ? 700 : 500,
                    textTransform: 'capitalize',
                    fontFamily: ui.font,
                  }}
                >
                  {s === 'both' ? 'Both' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'inline-flex',
                  border: `1px solid ${ui.color.border}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: ui.color.surface,
                }}
              >
                <button
                  type="button"
                  onClick={() => setView('bar')}
                  aria-pressed={view === 'bar'}
                  title="Stacked bars"
                  style={{
                    padding: '6px 10px',
                    border: 'none',
                    background: view === 'bar' ? ui.color.surfaceMuted : 'transparent',
                    color: ui.color.text,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M3 12h12" />
                    <path d="M3 18h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setView('donut')}
                  aria-pressed={view === 'donut'}
                  title="Donut"
                  style={{
                    padding: '6px 10px',
                    border: 'none',
                    background: view === 'donut' ? ui.color.surfaceMuted : 'transparent',
                    color: ui.color.text,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 4v8h8" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => downloadCsv(downloadRows)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: ui.color.text,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
                title="Download CSV"
              >
                Download ⬇
              </button>
            </div>
          </div>

          {/* Chart */}
          <div style={{ padding: '16px 16px 0', flex: 1, minHeight: 320 }}>
            {visibleStates.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: 240,
                  color: ui.color.textMuted,
                  fontSize: 13,
                }}
              >
                {search.trim()
                  ? `No focus states match “${search}”.`
                  : 'Pick at least one state from the map to see its segment mix.'}
              </div>
            ) : view === 'bar' ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <ScaleAxis />
                {visibleStates.map((s) => (
                  <StackedBarRow
                    key={s}
                    state={s}
                    segments={stateRows[s] ?? []}
                    sector={sector}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(visibleStates.length, 3)}, 1fr)`,
                  gap: 8,
                }}
              >
                {visibleStates.map((s) => (
                  <DonutChart
                    key={s}
                    state={s}
                    segments={stateRows[s] ?? []}
                    sector={sector}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div
            style={{
              borderTop: `1px solid ${ui.color.border}`,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: ui.color.text,
                  marginBottom: 8,
                }}
              >
                <span style={{ width: 28, height: 8, background: SECTOR_STRIPE.Urban, borderRadius: 2 }} />
                Urban segments
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: ui.color.text }}>
                {URBAN_SEGMENTS.map((k) => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, background: SEGMENT_META[k].color, borderRadius: 2 }} />
                    {SEGMENT_META[k].label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: ui.color.text,
                  marginBottom: 8,
                }}
              >
                <span style={{ width: 28, height: 8, background: SECTOR_STRIPE.Rural, borderRadius: 2 }} />
                Rural segments
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: ui.color.text }}>
                {RURAL_SEGMENTS.map((k) => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, background: SEGMENT_META[k].color, borderRadius: 2 }} />
                    {SEGMENT_META[k].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const mapBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: `1px solid ${ui.color.border}`,
  background: ui.color.surface,
  color: ui.color.chipText,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
