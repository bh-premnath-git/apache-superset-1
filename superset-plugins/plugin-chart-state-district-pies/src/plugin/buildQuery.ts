import { buildQueryContext, QueryFormData } from '@superset-ui/core';

import type { StateDistrictPiesFormData } from '../types';

/**
 * The server-side query groups by (state, district, category) and aggregates
 * the configured metric — we need the long-form row shape so `transformProps`
 * can bucket values into per-district pies without any client-side reshaping
 * of the result set itself.
 */
export default function buildQuery(formData: QueryFormData) {
  const fd = formData as StateDistrictPiesFormData;
  const groupby = [fd.state_column, fd.district_column, fd.category_column].filter(
    Boolean,
  );

  return buildQueryContext(fd, baseQueryObject => [
    {
      ...baseQueryObject,
      columns: groupby,
      groupby,
      metrics: fd.metric ? [fd.metric] : [],
      row_limit: fd.row_limit ?? 10000,
      orderby: fd.metric ? [[fd.metric, false]] : undefined,
    },
  ]);
}
