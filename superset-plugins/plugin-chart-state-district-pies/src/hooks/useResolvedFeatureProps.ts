import { useMemo } from 'react';

import { normalizeKey } from '../data/normalize';
import type {
  DistrictRow,
  GeoFeature,
  GeoFeatureCollection,
  StateAggregate,
  Wedge,
} from '../types';

export interface ResolvedFeatureProps {
  /** Best-guess property name on each state feature for joining to data. */
  stateFeatureKeyProp: string;
  /** Best-guess property name on each district feature for joining to data. */
  districtFeatureKeyProp: string;
  /** State totals enriched by inferring from district features when needed. */
  stateTotals: StateAggregate[];
  /** Dissolved (one MultiPolygon per state) outline geometry. */
  dissolvedStateGeo: GeoFeatureCollection | undefined;
}

interface Args {
  stateGeo: GeoFeatureCollection | undefined;
  districtGeo: GeoFeatureCollection | undefined;
  stateFeatureKeyProp: string;
  districtFeatureKeyProp: string;
  stateTotals: StateAggregate[];
  districts: DistrictRow[];
}

const STATE_KEY_CANDIDATES = [
  'NAME_1',
  'ST_NM',
  'state_name',
  'STATE',
  'name',
] as const;

const DISTRICT_KEY_CANDIDATES = [
  'NAME_2',
  'DISTRICT',
  'district',
  'DIST_CODE',
  'censuscode',
  'name',
] as const;

const DISTRICT_KEY_PRIORITY: Record<string, number> = {
  NAME_2: 6,
  DISTRICT: 5,
  district: 4,
  name: 2,
  DIST_CODE: 1,
  censuscode: 0,
};

/**
 * Resolve which feature properties to use as join keys, infer state totals
 * when the dataset only carries district granularity, and pre-build the
 * dissolved state outline used at the India zoom level.
 *
 * Pulled out of the orchestrator so each piece is independently memoised
 * and the orchestrator only has to deal with layout + drill state.
 */
export function useResolvedFeatureProps({
  stateGeo,
  districtGeo,
  stateFeatureKeyProp,
  districtFeatureKeyProp,
  stateTotals,
  districts,
}: Args): ResolvedFeatureProps {
  const districtBaseGeo = districtGeo ?? stateGeo;

  const resolvedStateFeatureKeyProp = useMemo(() => {
    if (!stateGeo) return stateFeatureKeyProp;
    const totalsKeys = new Set(stateTotals.map(s => normalizeKey(s.stateKey)));
    const candidates = [stateFeatureKeyProp, ...STATE_KEY_CANDIDATES];

    let bestProp = stateFeatureKeyProp;
    let bestMatched = -1;
    let bestUnique = -1;

    for (const prop of candidates) {
      if (!prop) continue;
      const values = stateGeo.features
        .map(f => String(f.properties?.[prop] ?? '').trim())
        .filter(Boolean);
      if (!values.length) continue;

      const unique = new Set(values.map(normalizeKey));
      const matched = Array.from(unique).filter(v => totalsKeys.has(v)).length;

      if (
        unique.size > 1 &&
        (matched > bestMatched ||
          (matched === bestMatched && unique.size > bestUnique))
      ) {
        bestMatched = matched;
        bestUnique = unique.size;
        bestProp = prop;
      }
    }
    return bestProp;
  }, [stateGeo, stateFeatureKeyProp, stateTotals]);

  const resolvedDistrictFeatureKeyProp = useMemo(() => {
    if (!districtBaseGeo) return districtFeatureKeyProp;
    const districtKeys = new Set(districts.map(d => normalizeKey(d.districtKey)));
    const candidates = [
      ...DISTRICT_KEY_CANDIDATES.slice(0, 3),
      districtFeatureKeyProp,
      ...DISTRICT_KEY_CANDIDATES.slice(3),
    ];

    let bestProp = districtFeatureKeyProp;
    let bestMatched = -1;
    let bestUnique = -1;
    let bestPriority = -1;

    for (const prop of candidates) {
      if (!prop) continue;
      const values = districtBaseGeo.features
        .map(f => String(f.properties?.[prop] ?? '').trim())
        .filter(Boolean);
      if (!values.length) continue;

      const unique = new Set(values.map(normalizeKey));
      const matched = Array.from(unique).filter(v => districtKeys.has(v)).length;
      const currentPriority =
        DISTRICT_KEY_PRIORITY[prop] ?? (prop === districtFeatureKeyProp ? 3 : 0);

      if (
        unique.size > 1 &&
        (matched > bestMatched ||
          (matched === bestMatched && unique.size > bestUnique) ||
          (matched === bestMatched &&
            unique.size === bestUnique &&
            currentPriority > bestPriority))
      ) {
        bestMatched = matched;
        bestUnique = unique.size;
        bestPriority = currentPriority;
        bestProp = prop;
      }
    }
    return bestProp;
  }, [districtBaseGeo, districtFeatureKeyProp, districts]);

  const enrichedStateTotals = useMemo<StateAggregate[]>(() => {
    const uniqueStates = new Set(stateTotals.map(s => normalizeKey(s.stateKey)));
    if (uniqueStates.size > 1) return stateTotals;
    if (!districtBaseGeo) return stateTotals;

    const districtToState = new Map<string, string>();
    for (const f of districtBaseGeo.features) {
      const district = String(
        f.properties?.[resolvedDistrictFeatureKeyProp] ?? '',
      ).trim();
      const state = String(
        f.properties?.[resolvedStateFeatureKeyProp] ?? '',
      ).trim();
      if (!district || !state) continue;
      districtToState.set(normalizeKey(district), state);
    }

    const byState = new Map<string, number>();
    const byStateWedges = new Map<string, Map<string, number>>();
    for (const d of districts) {
      const inferredState = districtToState.get(normalizeKey(d.districtKey));
      if (!inferredState) continue;
      byState.set(
        inferredState,
        (byState.get(inferredState) ?? 0) + d.totalWeight,
      );
      let bucket = byStateWedges.get(inferredState);
      if (!bucket) {
        bucket = new Map<string, number>();
        byStateWedges.set(inferredState, bucket);
      }
      for (const w of d.wedges) {
        bucket.set(w.category, (bucket.get(w.category) ?? 0) + w.value);
      }
    }

    const inferred = Array.from(byState.entries()).map(([stateKey, totalWeight]) => {
      const wedgesMap = byStateWedges.get(stateKey);
      const wedges: Wedge[] | undefined = wedgesMap
        ? Array.from(wedgesMap.entries()).map(([category, value]) => ({
            category,
            value,
          }))
        : undefined;
      return { stateKey, totalWeight, wedges };
    });

    return inferred.length > 0 ? inferred : stateTotals;
  }, [
    stateTotals,
    districtBaseGeo,
    resolvedDistrictFeatureKeyProp,
    resolvedStateFeatureKeyProp,
    districts,
  ]);

  const dissolvedStateGeo = useMemo<GeoFeatureCollection | undefined>(() => {
    if (!stateGeo) return undefined;
    const groups = new Map<string, number[][][][]>();
    const propKey = resolvedStateFeatureKeyProp;
    for (const f of stateGeo.features) {
      const key = String(f.properties?.[propKey] ?? '').trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      const geom = f.geometry;
      if (geom.type === 'Polygon') {
        groups.get(key)!.push(geom.coordinates as number[][][]);
      } else if (geom.type === 'MultiPolygon') {
        groups.get(key)!.push(...(geom.coordinates as number[][][][]));
      }
    }
    const features: GeoFeature[] = Array.from(groups.entries()).map(
      ([key, coords]) => ({
        type: 'Feature' as const,
        properties: { [propKey]: key },
        geometry: { type: 'MultiPolygon' as const, coordinates: coords },
      }),
    );
    return { type: 'FeatureCollection', features };
  }, [stateGeo, resolvedStateFeatureKeyProp]);

  return {
    stateFeatureKeyProp: resolvedStateFeatureKeyProp,
    districtFeatureKeyProp: resolvedDistrictFeatureKeyProp,
    stateTotals: enrichedStateTotals,
    dissolvedStateGeo,
  };
}
