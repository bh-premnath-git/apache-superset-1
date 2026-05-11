// CRM (Customer Readiness Metric) content layer — backed by the database.
//
// All FSP-facing copy (readiness tier labels, segment names, personas,
// product/channel hypothesis, channel activation ladder, readiness
// pillars, data-dimension panels) is seeded into Postgres via
// seed/pg/006_crm_segment_brief.sql and served by the home-shell backend
// at /extensions/my-org/home-shell/crm/{tiers,segments,dimensions}.
//
// This module exposes:
//   • Typed shapes for those payloads
//   • A `CrmProvider` that fetches once at shell mount time
//   • A `useCrm()` hook that returns the data + helpers
//
// Pages MUST consume CRM content via `useCrm()` — never hard-code names,
// product / channel text, tier mappings or ladder steps in the frontend.

import * as React from 'react';
import { useEffect, useState } from 'react';
import { api } from './api';
import { SegmentCode, SEGMENT_CODES } from './nav';

export type Rating = 'High' | 'Med' | 'Low';

export interface ReadinessPillar {
  rating: Rating;
  note: string;
}

// Each pillar is optional at the type level so callers must defensively
// handle the case where the backend / seed has not loaded yet. The
// canonical seed (006_crm_segment_brief.sql) always inserts all three
// (need / access / slack) for every segment.
export interface ReadinessPillars {
  need?: ReadinessPillar;
  access?: ReadinessPillar;
  slack?: ReadinessPillar;
}

export interface TierMeta {
  tier: number;
  label: string;
  tagline: string;
  badge_color: string;
  badge_bg: string;
  chip_color: string;
  members: SegmentCode[];
}

export interface SegmentBrief {
  segment: SegmentCode;
  sort_order: number;
  name: string;
  persona: string;
  overview: string;
  tier: number;
  tier_label: string;
  tier_tagline: string;
  tier_badge_color: string;
  tier_badge_bg: string;
  tier_chip_color: string;
  product: { headline: string; body: string };
  channel: { headline: string; body: string };
  readiness: ReadinessPillars;
  channel_ladder: string[];
}

export interface DataDimension {
  key: string;
  label: string;
  blurb: string;
  metrics: string[];
}

export interface CrmData {
  tiers: TierMeta[];
  tierOrder: number[];
  segments: SegmentBrief[];
  dimensions: DataDimension[];
  segmentByCode: Map<SegmentCode, SegmentBrief>;
  tierByNumber: Map<number, TierMeta>;
  allMetricKeys: string[];
}

export interface CrmState {
  data: CrmData | null;
  error: Error | null;
  loading: boolean;
}

const CrmContext = React.createContext<CrmState>({
  data: null,
  error: null,
  loading: true,
});

// Filter helpers in case the backend / seed ever drifts from the canonical
// R1..U3 set: silently drop unknown codes so a stray row can't crash the UI.
function isSegmentCode(s: unknown): s is SegmentCode {
  return typeof s === 'string' && (SEGMENT_CODES as readonly string[]).includes(s);
}

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CrmState>({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });

    Promise.all([api.crmTiers(), api.crmSegments(), api.crmDimensions()])
      .then(([tiersResp, segmentsResp, dimsResp]) => {
        if (cancelled) return;

        const tiers: TierMeta[] = (tiersResp.tiers ?? []).map((t) => ({
          ...t,
          members: (t.members ?? []).filter(isSegmentCode),
        }));
        const segments: SegmentBrief[] = (segmentsResp.segments ?? [])
          .filter((s) => isSegmentCode(s.segment))
          .map((s) => ({ ...s, segment: s.segment as SegmentCode }));
        const dimensions: DataDimension[] = dimsResp.dimensions ?? [];

        const segmentByCode = new Map<SegmentCode, SegmentBrief>();
        for (const s of segments) segmentByCode.set(s.segment, s);
        const tierByNumber = new Map<number, TierMeta>();
        for (const t of tiers) tierByNumber.set(t.tier, t);
        const tierOrder = [...tiers]
          .sort((a, b) => a.tier - b.tier)
          .map((t) => t.tier);
        const allMetricKeys = Array.from(
          new Set(dimensions.flatMap((d) => d.metrics)),
        );

        setState({
          data: { tiers, tierOrder, segments, dimensions, segmentByCode, tierByNumber, allMetricKeys },
          error: null,
          loading: false,
        });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setState({ data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <CrmContext.Provider value={state}>{children}</CrmContext.Provider>;
}

export function useCrmState(): CrmState {
  return React.useContext(CrmContext);
}

// Convenience hook — returns null while loading or on error. Pages that
// require CRM content should render their own loading / error states when
// `data` is null.
export function useCrm(): CrmData | null {
  return useCrmState().data;
}

// ── Presentation-only helpers (UI palette, not data) ─────────────────────

export const RATING_STYLE: Record<Rating, { bg: string; fg: string }> = {
  High: { bg: '#dcfce7', fg: '#166534' },
  Med: { bg: '#fef3c7', fg: '#92400e' },
  Low: { bg: '#fee2e2', fg: '#991b1b' },
};
