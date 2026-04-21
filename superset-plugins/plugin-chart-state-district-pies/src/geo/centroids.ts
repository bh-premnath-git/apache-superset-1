import type { GeoPath } from 'd3-geo';

import type { GeoFeature, GeoFeatureCollection } from '../types';

export interface FeatureCentroid {
  key: string;
  cx: number;
  cy: number;
  area: number;
  feature: GeoFeature;
}

/**
 * Extract projected centroids and approximate pixel areas for every feature
 * in the collection. The `keyProp` selects which feature property to use as
 * the join key with the data rows (e.g. "district_code", "censuscode").
 *
 * Area is taken from `path.area()` (pixels²) and later used to size each pie.
 */
export function featureCentroids(
  geo: GeoFeatureCollection,
  path: GeoPath,
  keyProp: string,
): FeatureCentroid[] {
  const out: FeatureCentroid[] = [];
  for (const feature of geo.features) {
    const raw = feature.properties?.[keyProp];
    if (raw == null || raw === '') continue;
    const [cx, cy] = path.centroid(feature as unknown as GeoJSON.Feature);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    const area = path.area(feature as unknown as GeoJSON.Feature);
    out.push({ key: String(raw), cx, cy, area, feature });
  }
  return out;
}
