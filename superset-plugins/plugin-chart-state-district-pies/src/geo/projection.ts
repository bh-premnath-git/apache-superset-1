import { geoMercator, geoPath, GeoProjection, GeoPath } from 'd3-geo';

import type { GeoFeatureCollection } from '../types';

export interface ProjectionBundle {
  projection: GeoProjection;
  path: GeoPath;
}

/**
 * Build a Mercator projection that fits the given FeatureCollection into the
 * available pixel box, reserving a small padding so coastlines don't touch
 * the chart edges.
 *
 * A single projection is shared between the state layer and the district
 * overlay so centroids line up exactly with the drawn geometries.
 */
export function fitProjection(
  geo: GeoFeatureCollection,
  width: number,
  height: number,
  padding = 8,
): ProjectionBundle {
  const projection = geoMercator();
  projection.fitExtent(
    [
      [padding, padding],
      [Math.max(width - padding, padding + 1), Math.max(height - padding, padding + 1)],
    ],
    geo as unknown as GeoJSON.FeatureCollection,
  );
  const path = geoPath(projection);
  return { projection, path };
}
