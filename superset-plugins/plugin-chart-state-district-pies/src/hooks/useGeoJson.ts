import { useEffect, useState } from 'react';

import type { GeoFeatureCollection } from '../types';

export interface GeoJsonState {
  data?: GeoFeatureCollection;
  error?: Error;
  loading: boolean;
}

/**
 * Lazily fetch a GeoJSON file once per URL. We deliberately do not bundle
 * district-level geometry into the plugin bundle — the district GeoJSON for
 * India is ~10–30MB and must be cached by the browser independently from
 * the JS bundle.
 *
 * The caller-supplied URL is expected to serve a GeoJSON FeatureCollection.
 * A thin in-module cache prevents duplicate fetches when multiple charts of
 * the same vizType are present on one dashboard.
 */
const CACHE = new Map<string, Promise<GeoFeatureCollection>>();

function fetchOnce(url: string): Promise<GeoFeatureCollection> {
  const cached = CACHE.get(url);
  if (cached) return cached;
  const pending = fetch(url, { credentials: 'omit' }).then(async response => {
    if (!response.ok) {
      throw new Error(
        `GeoJSON fetch failed: ${response.status} ${response.statusText} — ${url}`,
      );
    }
    return (await response.json()) as GeoFeatureCollection;
  });
  CACHE.set(url, pending);
  pending.catch(() => CACHE.delete(url));
  return pending;
}

export function useGeoJson(url: string | undefined): GeoJsonState {
  const [state, setState] = useState<GeoJsonState>({ loading: Boolean(url) });

  useEffect(() => {
    if (!url) {
      setState({ loading: false });
      return;
    }
    let cancelled = false;
    setState({ loading: true });
    fetchOnce(url)
      .then(data => {
        if (!cancelled) setState({ data, loading: false });
      })
      .catch(error => {
        if (!cancelled) setState({ error, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
