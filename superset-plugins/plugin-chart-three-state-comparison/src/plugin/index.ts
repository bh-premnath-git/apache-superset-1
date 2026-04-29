import { Behavior, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';

import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';
import type { ThreeStateComparisonFormData } from '../types';

const THUMBNAIL = '';

export default class ThreeStateComparisonChartPlugin extends ChartPlugin<ThreeStateComparisonFormData> {
  constructor() {
    const metadata = new ChartMetadata({
      name: t('Three-State Comparison'),
      description: t(
        'Compare LCA segment distribution across three states with an ' +
          'aggregate pie chart and per-state stacked bars.',
      ),
      thumbnail: THUMBNAIL,
      tags: [t('Comparison'), t('Pie'), t('Stacked Bar'), t('Custom')],
      category: t('Comparison'),
      behaviors: [
        Behavior.INTERACTIVE_CHART,
        Behavior.CROSS_FILTER,
      ],
    });

    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('../components/ThreeStateComparison'),
      metadata,
      transformProps,
    });
  }
}
