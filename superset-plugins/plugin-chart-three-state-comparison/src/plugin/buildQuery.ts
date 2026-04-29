import { buildQueryContext, QueryFormData } from '@superset-ui/core';

import type { ThreeStateComparisonFormData } from '../types';

/**
 * Build a simple GROUP BY (state, segment) query with the configured metric.
 * The adhoc_filters on the chart editor typically restrict to the 3 target
 * states; the plugin itself is state-count-agnostic.
 */
export default function buildQuery(formData: QueryFormData) {
  const fd = formData as ThreeStateComparisonFormData;
  const groupby = [fd.state_column, fd.segment_column].filter(Boolean);

  return buildQueryContext(fd, baseQueryObject => [
    {
      ...baseQueryObject,
      columns: groupby,
      groupby,
      metrics: fd.metric ? [fd.metric] : [],
      row_limit: fd.row_limit ?? 500,
      orderby: fd.metric ? [[fd.metric, false]] : undefined,
    },
  ]);
}
