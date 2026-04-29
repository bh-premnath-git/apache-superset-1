import { useEffect, useMemo, useState } from 'react';
import { SupersetClient } from '@superset-ui/core';

import {
  buildMetricsRequestBody,
  metricKeyFor,
  type MetricsQueryArgs,
} from '../data/buildMetricsQuery';
import type { MetricDefinition } from '../constants';

export interface MetricsRow {
  segment: string;
  /** Numeric value per metric, keyed by the metric's `label`. */
  values: Record<string, number | null>;
}

export interface DetailMetricsState {
  /** True while the per-district fetch is in flight. */
  loading: boolean;
  error?: Error;
  rows: MetricsRow[];
}

interface FetchArgs {
  datasourceId: number | undefined;
  stateColumn: string;
  districtColumn: string;
  segmentColumn: string;
  state: string;
  district: string;
  definitions: MetricDefinition[];
}

const CACHE = new Map<string, Promise<MetricsRow[]>>();

/**
 * Fetch per-segment detail metrics for the selected district. Triggered
 * when the detail page mounts; module-scoped LRU-by-insertion-order
 * cache keeps repeat district visits free.
 *
 * The hook is intentionally a no-op when `datasourceId` is undefined so
 * the rich detail metrics table can be opt-in via the control panel.
 */
export function useDetailMetrics(args: FetchArgs): DetailMetricsState {
  const cacheKey = useMemo(() => buildCacheKey(args), [args]);
  const enabled =
    args.datasourceId !== undefined && args.definitions.length > 0;

  const [state, setState] = useState<DetailMetricsState>({
    loading: enabled,
    rows: [],
  });

  useEffect(() => {
    if (!enabled || !args.datasourceId) {
      setState({ loading: false, rows: [] });
      return;
    }
    let cancelled = false;
    setState({ loading: true, rows: [] });

    const queryArgs: MetricsQueryArgs = {
      datasourceId: args.datasourceId,
      stateColumn: args.stateColumn,
      districtColumn: args.districtColumn,
      segmentColumn: args.segmentColumn,
      state: args.state,
      district: args.district,
      definitions: args.definitions,
    };

    fetchOnce(cacheKey, queryArgs)
      .then(rows => {
        if (!cancelled) setState({ loading: false, rows });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ loading: false, error, rows: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, enabled, args]);

  return state;
}

function buildCacheKey(args: FetchArgs): string {
  const defsHash = args.definitions
    .map((d, i) => `${i}:${d.label}:${d.sql.length}`)
    .join('|');
  return [
    args.datasourceId ?? '',
    args.stateColumn,
    args.districtColumn,
    args.segmentColumn,
    args.state,
    args.district,
    defsHash,
  ].join('::');
}

function fetchOnce(
  key: string,
  args: MetricsQueryArgs,
): Promise<MetricsRow[]> {
  const cached = CACHE.get(key);
  if (cached) return cached;
  const pending = SupersetClient.post({
    endpoint: '/api/v1/chart/data',
    jsonPayload: buildMetricsRequestBody(args),
  })
    .then((resp: any) => {
      const data: any[] = resp?.json?.result?.[0]?.data ?? [];
      return data.map(row => parseRow(row, args));
    });
  CACHE.set(key, pending);
  pending.catch(() => CACHE.delete(key));
  return pending;
}

function parseRow(row: any, args: MetricsQueryArgs): MetricsRow {
  const segment = String(row?.[args.segmentColumn] ?? '').trim();
  const values: Record<string, number | null> = {};
  args.definitions.forEach((d, i) => {
    const key = metricKeyFor(d.label, i);
    const raw = row?.[key];
    const num =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(raw)
          : NaN;
    values[d.label] = Number.isFinite(num) ? num : null;
  });
  return { segment, values };
}
