import {
  Behavior,
  ChartMetadata,
  ChartPlugin,
  t,
} from '@superset-ui/core';

import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';
import type { StateDistrictPiesFormData } from '../types';

const THUMBNAIL = '';

/**
 * The plugin class is the single registration unit. Every other module in
 * `src/plugin/` is a pure function consumed here — splitting responsibilities
 * this way mirrors the official Superset plugin packages under
 * `superset-frontend/plugins/` and keeps individual modules unit-testable.
 */
export default class StateDistrictPiesChartPlugin extends ChartPlugin<StateDistrictPiesFormData> {
  constructor() {
    const metadata = new ChartMetadata({
      name: t('State + District Pies'),
      description: t(
        'Choropleth of states overlaid with a small proportional pie per ' +
          'district. Designed for the LCA segment view of the Household Survey.',
      ),
      thumbnail: THUMBNAIL,
      tags: [t('Geo'), t('Choropleth'), t('Pie'), t('Custom')],
      category: t('Map'),
      behaviors: [
        Behavior.INTERACTIVE_CHART,
        Behavior.DRILL_TO_DETAIL,
        Behavior.DRILL_BY,
      ],
    });

    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('../components/StateDistrictPies'),
      metadata,
      transformProps,
    });
  }
}
