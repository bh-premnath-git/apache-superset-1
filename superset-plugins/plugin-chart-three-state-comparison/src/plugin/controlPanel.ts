import { validateNonEmpty } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import {
  ControlPanelConfig,
  sharedControls,
} from '@superset-ui/chart-controls';

import {
  DEFAULT_STATE_ORDER,
  DEFAULT_SEGMENT_ORDER,
  DEFAULT_SHOW_LEGEND,
  DEFAULT_SHOW_PERCENTAGES,
  DEFAULT_LEGEND_POSITION,
  DEFAULT_PERCENT_DECIMALS,
  DEFAULT_LABEL_THRESHOLD,
} from '../constants';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'state_column',
            config: {
              ...sharedControls.entity,
              label: t('State column'),
              description: t(
                'Column containing state names (e.g. state_label).',
              ),
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'segment_column',
            config: {
              ...sharedControls.entity,
              label: t('Segment column'),
              description: t(
                'Column containing segment codes (R1, R2, R3, R4, U1, U2, U3).',
              ),
              validators: [validateNonEmpty],
            },
          },
        ],
        ['metric'],
        ['adhoc_filters'],
        ['row_limit'],
      ],
    },
    {
      label: t('Data Order'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'state_order',
            config: {
              type: 'TextControl',
              label: t('State display order'),
              description: t(
                'Comma-separated state names controlling bar chart order.',
              ),
              default: DEFAULT_STATE_ORDER.join(', '),
            },
          },
        ],
        [
          {
            name: 'segment_order',
            config: {
              type: 'TextControl',
              label: t('Segment order'),
              description: t(
                'Comma-separated segment codes controlling stack and legend order.',
              ),
              default: DEFAULT_SEGMENT_ORDER.join(', '),
            },
          },
        ],
      ],
    },
    {
      label: t('Display'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'show_legend',
            config: {
              type: 'CheckboxControl',
              label: t('Show legend'),
              default: DEFAULT_SHOW_LEGEND,
            },
          },
        ],
        [
          {
            name: 'show_percentages',
            config: {
              type: 'CheckboxControl',
              label: t('Show percentage labels'),
              default: DEFAULT_SHOW_PERCENTAGES,
            },
          },
        ],
        [
          {
            name: 'legend_position',
            config: {
              type: 'SelectControl',
              label: t('Legend position'),
              choices: [
                ['bottom', 'Bottom'],
                ['right', 'Right'],
              ],
              default: DEFAULT_LEGEND_POSITION,
            },
          },
        ],
        [
          {
            name: 'percent_decimals',
            config: {
              type: 'SelectControl',
              label: t('Percentage decimals'),
              choices: [
                [0, '0%'],
                [1, '0.0%'],
              ],
              default: DEFAULT_PERCENT_DECIMALS,
            },
          },
        ],
        [
          {
            name: 'label_threshold',
            config: {
              type: 'TextControl',
              isInt: true,
              label: t('Label threshold (%)'),
              description: t(
                'Minimum percentage for a segment to show its label on the chart.',
              ),
              default: DEFAULT_LABEL_THRESHOLD,
            },
          },
        ],
        ['color_scheme'],
      ],
    },
  ],
};

export default config;
