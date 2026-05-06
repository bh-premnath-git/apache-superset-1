import * as React from 'react';
import { useMemo } from 'react';
import { ui } from '../theme';
import { Card } from '../components/Card';
import { Kpi } from '../components/Kpi';
import { api, useFetch } from '../api';

// Living Conditions Approach (LCA) segmentation as defined in
// seed/pg/002_lca_segment_views.sql. Rural and urban households are
// classified separately from digital, asset and connectivity signals
// recorded on household.hh_master.

type Band = 'Rural' | 'Urban';

interface SegmentDef {
  code: string;
  band: Band;
  label: string;
  rule: string;
  color: string;
}

const SEGMENT_DEFS: Record<string, SegmentDef> = {
  R1: {
    code: 'R1',
    band: 'Rural',
    label: 'Connected, asset-rich rural',
    rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
    color: '#1d4ed8',
  },
  R2: {
    code: 'R2',
    band: 'Rural',
    label: 'Digitally engaged rural',
    rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not R1)',
    color: '#2563eb',
  },
  R3: {
    code: 'R3',
    band: 'Rural',
    label: 'Low-connectivity rural',
    rule: 'digital_score ≤ 1 AND internet_access = 0',
    color: '#60a5fa',
  },
  R4: {
    code: 'R4',
    band: 'Rural',
    label: 'Most constrained rural',
    rule: 'fallback — none of R1/R2/R3 apply',
    color: '#93c5fd',
  },
  U1: {
    code: 'U1',
    band: 'Urban',
    label: 'Connected, asset-rich urban',
    rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
    color: '#9333ea',
  },
  U2: {
    code: 'U2',
    band: 'Urban',
    label: 'Digitally engaged urban',
    rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not U1)',
    color: '#a855f7',
  },
  U3: {
    code: 'U3',
    band: 'Urban',
    label: 'Most constrained urban',
    rule: 'fallback — neither U1 nor U2 applies',
    color: '#c4b5fd',
  },
};

const SEGMENT_ORDER = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'] as const;

function fmtInt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-IN');
}

function fmtPct(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function SegmentCard({
  s,
  share,
}: {
  s: SegmentDef;
  share?: number;
}) {
  return (
    <div
      style={{
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        borderLeft: `4px solid ${s.color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 14, color: ui.color.text }}>{s.code}</strong>
        <span style={{ fontSize: 11, color: ui.color.textMuted }}>{s.band}</span>
      </div>
      <div style={{ fontSize: 13, color: ui.color.text }}>{s.label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ fontWeight: 700, color: ui.color.text }}>{fmtPct(share)}</span>
        <div style={{ flex: 1, background: ui.color.surfaceMuted, borderRadius: 4, height: 6 }}>
          <div
            style={{
              width: `${Math.min(100, share ?? 0)}%`,
              height: '100%',
              background: s.color,
              borderRadius: 4,
            }}
          />
        </div>
      </div>
      <code style={{ fontSize: 11, color: ui.color.textMuted, lineHeight: 1.5 }}>{s.rule}</code>
    </div>
  );
}

export function OverviewView() {
  const summary = useFetch(() => api.summary(), []);
  const segments = useFetch(() => api.segments(), []);
  const mpce = useFetch(() => api.mpce(), []);

  const sharesByCode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of segments.data?.segments ?? []) map[row.segment] = row.share_pct;
    return map;
  }, [segments.data]);

  const rural = SEGMENT_ORDER.filter((c) => SEGMENT_DEFS[c].band === 'Rural').map((c) => SEGMENT_DEFS[c]);
  const urban = SEGMENT_ORDER.filter((c) => SEGMENT_DEFS[c].band === 'Urban').map((c) => SEGMENT_DEFS[c]);

  const fetchError = summary.error ?? segments.error ?? mpce.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ui.color.text }}>
          India Household Segmentation — Overview
        </h1>
        <p style={{ margin: '6px 0 0', color: ui.color.textMuted, fontSize: 13, maxWidth: 880 }}>
          Living Conditions Approach (LCA) segmentation of Indian households using digital,
          asset and connectivity signals from <code>household.hh_master</code> (NSSO HCES-style
          survey schema). Rural households are classified into <strong>R1–R4</strong> (best to most
          constrained) and urban households into <strong>U1–U3</strong>. All counts on this page
          are weighted by the survey weight <code>wt</code>. Focus states:{' '}
          {(summary.data?.states_focus ?? ['Bihar', 'Jharkhand', 'Madhya Pradesh']).join(', ')}.
        </p>
      </div>

      {fetchError && (
        <div style={{ padding: 12, border: `1px solid ${ui.color.border}`, borderRadius: 8, color: '#b00020', fontSize: 12 }}>
          Could not load live segmentation data: {fetchError.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        <Kpi
          label="Weighted households"
          value={summary.loading ? '…' : fmtInt(summary.data?.weighted_households)}
          hint={`SUM(wt) over ${(summary.data?.states_focus ?? []).length || 3} focus states`}
        />
        <Kpi
          label="Districts covered"
          value={summary.loading ? '…' : fmtInt(summary.data?.districts_covered)}
          hint="Distinct district_name in vw_state_district_segment_geo"
        />
        <Kpi
          label="Segments observed"
          value={summary.loading ? '…' : fmtInt(summary.data?.segments_observed)}
          hint="R1–R4 rural · U1–U3 urban"
        />
        <Kpi
          label="States in focus"
          value={summary.loading ? '…' : fmtInt(summary.data?.states_covered)}
          hint={(summary.data?.states_focus ?? []).join(', ')}
        />
      </div>

      <Card
        title="LCA segments — weighted share"
        subtitle="Definitions from seed/pg/002_lca_segment_views.sql · shares from vw_state_segment_distribution"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ui.color.textMuted, marginBottom: 6 }}>
              Rural band — classified when <code>sector_label</code> is not Urban
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {rural.map((s) => (
                <SegmentCard key={s.code} s={s} share={sharesByCode[s.code]} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ui.color.textMuted, marginBottom: 6 }}>
              Urban band — classified when <code>sector_label ILIKE 'Urban'</code>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {urban.map((s) => (
                <SegmentCard key={s.code} s={s} share={sharesByCode[s.code]} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Weighted MPCE per segment" subtitle="₹ / month — vw_mpce_by_segment (focus states)">
          {mpce.loading ? (
            <div style={{ fontSize: 12, color: ui.color.textMuted }}>Loading…</div>
          ) : (mpce.data?.segments?.length ?? 0) === 0 ? (
            <div style={{ fontSize: 12, color: ui.color.textMuted }}>No data available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              {(mpce.data?.segments ?? []).map((row) => {
                const def = SEGMENT_DEFS[row.segment];
                const max = Math.max(...(mpce.data?.segments ?? []).map((r) => r.mean_mpce || 0), 1);
                return (
                  <div
                    key={row.segment}
                    style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px 70px', alignItems: 'center', gap: 8 }}
                  >
                    <strong style={{ color: ui.color.text }}>{row.segment}</strong>
                    <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 8 }}>
                      <div
                        style={{
                          width: `${(row.mean_mpce / max) * 100}%`,
                          height: '100%',
                          background: def?.color ?? '#1d4ed8',
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <span style={{ textAlign: 'right', color: ui.color.text }}>
                      ₹{fmtInt(row.mean_mpce)}
                    </span>
                    <span style={{ textAlign: 'right', color: ui.color.textMuted, fontSize: 11 }}>
                      ±{fmtInt(row.stddev_mpce)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Classification signals" subtitle="Computed per household from hh_master columns">
          <div style={{ fontSize: 13, color: ui.color.text, lineHeight: 1.7 }}>
            <div>
              <code>digital_score</code> ={' '}
              <span style={{ color: ui.color.textMuted }}>
                2·any_internet + Possess_Mobile + Online_Groceries
              </span>
            </div>
            <div>
              <code>asset_score</code> ={' '}
              <span style={{ color: ui.color.textMuted }}>2·Possess_Car + Possess_Mobile</span>
            </div>
            <div>
              <code>internet_access</code> ={' '}
              <span style={{ color: ui.color.textMuted }}>any_internet (0/1)</span>
            </div>
            <div>
              <code>mobile_ownership</code> ={' '}
              <span style={{ color: ui.color.textMuted }}>Possess_Mobile (0/1)</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: ui.color.textMuted }}>
              Households missing all signals fall through to R4 / U3.
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Weighted households per state"
        subtitle="vw_state_segment_distribution · SUM(wt) per state_label"
      >
        {summary.loading ? (
          <div style={{ fontSize: 12, color: ui.color.textMuted }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {(summary.data?.per_state ?? []).map((row) => {
              const max = Math.max(
                ...((summary.data?.per_state ?? []).map((r) => r.weighted_households) || [1]),
                1,
              );
              return (
                <div
                  key={row.state}
                  style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ color: ui.color.text }}>{row.state}</span>
                  <div style={{ background: ui.color.surfaceMuted, borderRadius: 4, height: 8 }}>
                    <div
                      style={{
                        width: `${(row.weighted_households / max) * 100}%`,
                        height: '100%',
                        background: '#1d4ed8',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span style={{ textAlign: 'right', color: ui.color.textMuted }}>
                    {fmtInt(row.weighted_households)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
