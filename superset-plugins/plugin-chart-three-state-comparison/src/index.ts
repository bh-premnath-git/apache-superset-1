/**
 * Package entry. The plugin class is what Superset's MainPreset `new()`s.
 */
export { default } from './plugin';
export { default as ThreeStateComparisonChartPlugin } from './plugin';

export type {
  ThreeStateComparisonProps,
  ThreeStateComparisonFormData,
  Wedge,
  StackSegment,
  StateStack,
} from './types';
