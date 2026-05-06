import * as React from 'react';
import { ui } from '../theme';
import { Card } from '../components/Card';
import { Kpi } from '../components/Kpi';

// Living Conditions Approach (LCA) segmentation as defined in
// seed/pg/002_lca_segment_views.sql. Rural and urban households are
// classified separately from digital, asset and connectivity signals
// recorded on household.hh_master:
//
//   digital_score   = (any_internet ? 2) + (Possess_Mobile ? 1) + (Online_Groceries ? 1)
//   asset_score     = (Possess_Car ? 2) + (Possess_Mobile ? 1)
//   internet_access = any_internet
//   mobile_ownership = Possess_Mobile
//
// Anything missing all signals falls into the most-constrained bucket
// (R4 / U3).

type Band = 'Rural' | 'Urban';

interface SegmentDef {
  code: string;
  band: Band;
  label: string;
  rule: string;
  color: string;
}

const SEGMENT_DEFS: SegmentDef[] = [
  {
    code: 'R1',
    band: 'Rural',
    label: 'Connected, asset-rich rural',
    rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
    color: '#1d4ed8',
  },
  {
    code: 'R2',
    band: 'Rural',
    label: 'Digitally engaged rural',
    rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not R1)',
    color: '#2563eb',
  },
  {
    code: 'R3',
    band: 'Rural',
    label: 'Low-connectivity rural',
    rule: 'digital_score ≤ 1 AND internet_access = 0',
    color: '#60a5fa',
  },
  {
    code: 'R4',
    band: 'Rural',
    label: 'Most constrained rural',
    rule: 'fallback — none of R1/R2/R3 apply',
    color: '#93c5fd',
  },
  {
    code: 'U1',
    band: 'Urban',
    label: 'Connected, asset-rich urban',
    rule: 'asset_score ≥ 2 AND digital_score ≥ 2 AND internet_access = 1',
    color: '#9333ea',
  },
  {
    code: 'U2',
    band: 'Urban',
    label: 'Digitally engaged urban',
    rule: 'digital_score ≥ 2 AND mobile_ownership = 1 (and not U1)',
    color: '#a855f7',
  },
  {
    code: 'U3',
    band: 'Urban',
    label: 'Most constrained urban',
    rule: 'fallback — neither U1 nor U2 applies',
    color: '#c4b5fd',
  },
];

interface DatasetEntry {
  key: string;
  view: string;
  purpose: string;
}

// Sourced from /apache-superset-1/assets/datasets/*.yaml
const DATASETS: DatasetEntry[] = [
  {
    key: 'hh_master',
    view: 'household.hh_master',
    purpose: 'Base household survey table (NSSO HCES-style); inputs to LCA scoring',
  },
  {
    key: 'lca_segment_distribution',
    view: 'household.vw_segment_distribution',
    purpose: 'All-India weighted households per (state, sector, segment)',
  },
  {
    key: 'lca_state_segment_distribution',
    view: 'household.vw_state_segment_distribution',
    purpose: 'Per-state stacked bars — Bihar / Jharkhand / Madhya Pradesh',
  },
  {
    key: 'lca_state_district_segment',
    view: 'household.vw_state_district_segment',
    purpose: 'Long-form (state, district, segment) feeding state_district_pies',
  },
  {
    key: 'lca_state_district_segment_geo',
    view: 'household.vw_state_district_segment_geo',
    purpose: 'District-grain segment mix with GeoJSON Point geometry',
  },
  {
    key: 'lca_district_segment_pie',
    view: 'household.vw_district_segment_pie',
    purpose: 'Pre-computed segment % + cumulative endpoints for conic-gradient pies',
  },
  {
    key: 'lca_segment_minor_bucket',
    view: 'household.vw_segment_minor_bucket',
    purpose: 'Weighted households by U15-minor bucket × segment × state × sector',
  },
  {
    key: 'lca_mpce_by_segment',
    view: 'household.vw_mpce_by_segment',
    purpose: 'Monthly per-capita expenditure aggregated to (segment, sector)',
  },
  {
    key: 'hh_master_metrics_geo',
    view: 'household.vw_hh_master_metrics_geo',
    purpose: 'Per-household enrichment with segment + district_name for detail drill',
  },
];

const FOCUS_STATES = ['Bihar', 'Jharkhand', 'Madhya Pradesh'];

function SegmentCard({ s }: { s: SegmentDef }) {
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
      <code style={{ fontSize: 11, color: ui.color.textMuted, lineHeight: 1.5 }}>{s.rule}</code>
    </div>
  );
}

export function OverviewView() {
  const rural = SEGMENT_DEFS.filter((s) => s.band === 'Rural');
  const urban = SEGMENT_DEFS.filter((s) => s.band === 'Urban');

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
          constrained) and urban households into <strong>U1–U3</strong>. Weighted by survey weight
          <code> wt</code> on every aggregate. Focus states: Bihar, Jharkhand, Madhya Pradesh.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        <Kpi label="Focus states" value="3" hint={FOCUS_STATES.join(', ')} />
        <Kpi label="Segments" value="7" hint="R1–R4 rural · U1–U3 urban" />
        <Kpi label="Analytic views" value={String(DATASETS.length - 1)} hint="Built on household.hh_master" />
        <Kpi label="Source schema" value="household" hint="PostgreSQL · db.analytics" />
      </div>

      <Card
        title="LCA segments"
        subtitle="Definitions sourced from seed/pg/002_lca_segment_views.sql"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ui.color.textMuted, marginBottom: 6 }}>
              Rural band — classified when <code>sector_label</code> is not Urban
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {rural.map((s) => <SegmentCard key={s.code} s={s} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ui.color.textMuted, marginBottom: 6 }}>
              Urban band — classified when <code>sector_label ILIKE 'Urban'</code>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {urban.map((s) => <SegmentCard key={s.code} s={s} />)}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

        <Card title="Aggregates carried per row" subtitle="Why grain matters for drill-by">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: ui.color.text, lineHeight: 1.7 }}>
            <li>
              <code>seg_weight</code> = SUM(wt) — weighted household count per segment
            </li>
            <li>
              <code>hh_weight</code> on <code>vw_state_district_segment*</code> — same SUM(wt),
              renamed for the <code>state_district_pies</code> plugin
            </li>
            <li>
              <code>weighted_mean_mpce</code> = SUM(mean_mpce·weighted_count) / SUM(weighted_count)
              on <code>vw_mpce_by_segment</code>
            </li>
            <li>
              Dimensions <code>state_label</code> and <code>sector_label</code> are kept on every
              view so Superset's drill-by has pivot targets
            </li>
          </ul>
        </Card>
      </div>

      <Card
        title="Data sources"
        subtitle="Datasets registered under assets/datasets/*.yaml against db.analytics"
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: ui.color.textMuted }}>
                <th style={{ padding: '6px 10px 6px 0', fontWeight: 600 }}>Asset key</th>
                <th style={{ padding: '6px 10px', fontWeight: 600 }}>Schema.view</th>
                <th style={{ padding: '6px 10px', fontWeight: 600 }}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {DATASETS.map((d) => (
                <tr key={d.key} style={{ borderTop: `1px solid ${ui.color.border}` }}>
                  <td style={{ padding: '8px 10px 8px 0', color: ui.color.text }}>{d.key}</td>
                  <td style={{ padding: '8px 10px', color: ui.color.text }}>
                    <code>{d.view}</code>
                  </td>
                  <td style={{ padding: '8px 10px', color: ui.color.textMuted }}>{d.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Charts wired against this segmentation" subtitle="assets/charts/*.yaml">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: ui.color.text, lineHeight: 1.7 }}>
          <li>
            <strong>chart.household.district_pie_unified</strong> —{' '}
            <code>state_district_pies</code> plugin over{' '}
            <code>vw_state_district_segment_geo</code>; state choropleth + per-district pies, drill
            into rural/urban detail tables
          </li>
          <li>
            <strong>chart.household.three_state_comparison</strong> —{' '}
            <code>three_state_comparison</code> plugin over{' '}
            <code>vw_state_segment_distribution</code> filtered to Bihar / Jharkhand / Madhya
            Pradesh, segment order <code>R1, R2, R3, R4, U1, U2, U3</code>
          </li>
        </ul>
      </Card>
    </div>
  );
}
