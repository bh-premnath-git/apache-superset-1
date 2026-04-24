// Minimal stubs so transformProps and friends can be tested without a
// full @superset-ui/core install. Only the symbols we actually import from
// the plugin need to be represented.

export function t(s: string): string {
  return s;
}

export function validateNonEmpty(v: unknown): boolean | string {
  if (v == null || v === '') return 'required';
  return false;
}

export const Behavior = {
  INTERACTIVE_CHART: 'INTERACTIVE_CHART',
  DRILL_TO_DETAIL: 'DRILL_TO_DETAIL',
  DRILL_BY: 'DRILL_BY',
} as const;

export class ChartMetadata {
  constructor(public config: Record<string, unknown>) {}
}

export class ChartPlugin<T = unknown> {
  constructor(public config: Record<string, unknown>) {}
  configure(_: { key: string }) {
    return this;
  }
}

export const CategoricalColorNamespace = {
  getScale: (_?: string) => (k: string) => k,
};

export function buildQueryContext(
  formData: unknown,
  builder: (base: Record<string, unknown>) => Array<Record<string, unknown>>,
) {
  return { formData, queries: builder({}) };
}

export type QueryFormData = Record<string, unknown>;
export type ChartProps = Record<string, unknown>;
export type DataRecord = Record<string, unknown>;
