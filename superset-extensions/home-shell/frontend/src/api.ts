// Thin client for the home-shell backend mounted at
// /extensions/my-org/home-shell/. Shapes mirror the Flask response payloads
// in backend/src/my_org/home_shell/entrypoint.py.

import { useEffect, useState } from 'react';

const BASE = '/extensions/my-org/home-shell';

export interface SegmentShare {
  segment: string;
  weighted_count: number;
  share_pct: number;
}

export interface SummaryResponse {
  states_focus: string[];
  weighted_households: number;
  segments_observed: number;
  states_covered: number;
  districts_covered: number;
  per_state: { state: string; weighted_households: number }[];
}

export interface SegmentsResponse {
  states_focus: string[];
  segments: (SegmentShare & { sector: 'Rural' | 'Urban' })[];
}

export interface StatesSegmentsResponse {
  states_focus: string[];
  states: {
    state: string;
    total_weight: number;
    segments: SegmentShare[];
  }[];
}

export interface DistrictRow {
  district: string;
  total_weight: number;
  segments: SegmentShare[];
}

export interface StateDistrictsResponse {
  state: string;
  districts: DistrictRow[];
}

export interface DistrictDetailResponse {
  state: string;
  district: string;
  weighted_households: number;
  sector_mix: { sector: 'Rural' | 'Urban'; weighted_count: number }[];
  segments: SegmentShare[];
}

export interface MpceRow {
  segment: string;
  sector: 'Rural' | 'Urban';
  segment_order: number;
  mean_mpce: number;
  stddev_mpce: number;
  weighted_count: number;
  overall_sector_mean: number;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 400);
    } catch {
      /* noop */
    }
    throw new Error(`${res.status} ${res.statusText} — ${path}${detail ? ` — ${detail}` : ''}`);
  }
  // Flask-AppBuilder wraps payloads under { result: ... }.
  const body = (await res.json()) as { result?: T } | T;
  if (body && typeof body === 'object' && 'result' in (body as any)) {
    return (body as { result: T }).result;
  }
  return body as T;
}

export const api = {
  summary: (states?: string[]) =>
    getJson<SummaryResponse>(`/summary${states ? `?states=${encodeURIComponent(states.join(','))}` : ''}`),
  segments: (states?: string[]) =>
    getJson<SegmentsResponse>(
      `/segments${states ? `?states=${encodeURIComponent(states.join(','))}` : ''}`,
    ),
  statesSegments: (states?: string[]) =>
    getJson<StatesSegmentsResponse>(
      `/states/segments${states ? `?states=${encodeURIComponent(states.join(','))}` : ''}`,
    ),
  stateDistricts: (state: string) =>
    getJson<StateDistrictsResponse>(`/states/${encodeURIComponent(state)}/districts`),
  districtDetail: (state: string, district: string) =>
    getJson<DistrictDetailResponse>(
      `/states/${encodeURIComponent(state)}/districts/${encodeURIComponent(district)}`,
    ),
  mpce: () => getJson<{ segments: MpceRow[] }>('/mpce'),
};

export function useFetch<T>(loader: () => Promise<T>, deps: unknown[]):
  { data?: T; error?: Error; loading: boolean } {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({
    loading: true,
  });
  useEffect(() => {
    let cancelled = false;
    setState({ loading: true });
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ error, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
