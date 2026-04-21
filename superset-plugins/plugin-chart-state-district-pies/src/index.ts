/**
 * Package entry. Keep the public surface minimal — the plugin class itself
 * is what Superset's dynamic-plugin loader `new()`s via Module Federation.
 */
export { default } from './plugin';
export { default as StateDistrictPiesChartPlugin } from './plugin';

export type {
  StateDistrictPiesProps,
  StateDistrictPiesFormData,
  DistrictRow,
  StateAggregate,
  Wedge,
} from './types';
