import { t, validateNonEmpty } from '@superset-ui/core';
import {
  ControlPanelConfig,
  sections,
  sharedControls,
} from '@superset-ui/chart-controls';

import {
  DEFAULT_MAX_PIE_RADIUS,
  DEFAULT_MIN_PIE_RADIUS,
} from '../constants';

/**
 * Keep the editor surface intentionally small:
 *   - Query section: join columns + the metric that sizes each pie.
 *   - Map section: URLs + feature-property keys used to join the geometry
 *     to the rows. Deferring geometry hosting to the operator avoids
 *     bundling ~10–30MB of district geojson into the plugin asset.
 *   - Customize section: palette, pie radius range, and feature toggles.
 */
const config: ControlPanelConfig = {
  controlPanelSections: [
    sections.legacyRegularTime,
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
                'Column whose values match the state-level GeoJSON feature key ' +
                  '(e.g. ISO 3166-2 code, state name).',
              ),
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'district_column',
            config: {
              ...sharedControls.entity,
              label: t('District column'),
              description: t(
                'Column whose values match the district-level GeoJSON feature key.',
              ),
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'category_column',
            config: {
              ...sharedControls.entity,
              label: t('Pie category column'),
              description: t(
                'Column whose distinct values become the wedges of each ' +
                  'per-district pie (e.g. segment code R1/R2/...).',
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
      label: t('Map sources'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'state_geojson_url',
            config: {
              type: 'TextControl',
              label: t('State GeoJSON URL'),
              description: t(
                'URL serving the state-level FeatureCollection. Self-hosted ' +
                  '— no external service calls are made by Superset.',
              ),
              validators: [validateNonEmpty],
              default: '',
            },
          },
        ],
        [
          {
            name: 'district_geojson_url',
            config: {
              type: 'TextControl',
              label: t('District GeoJSON URL'),
              description: t(
                'URL serving the district-level FeatureCollection.',
              ),
              validators: [validateNonEmpty],
              default: '',
            },
          },
        ],
        [
          {
            name: 'state_feature_key_prop',
            config: {
              type: 'TextControl',
              label: t('State feature key property'),
              description: t(
                'Property name on each state feature used to match rows ' +
                  '(e.g. "ISO", "ST_NM").',
              ),
              default: 'ISO',
            },
          },
        ],
        [
          {
            name: 'district_feature_key_prop',
            config: {
              type: 'TextControl',
              label: t('District feature key property'),
              description: t(
                'Property name on each district feature used to match rows ' +
                  '(e.g. "censuscode", "DIST_CODE").',
              ),
              default: 'censuscode',
            },
          },
        ],
      ],
    },
    {
      label: t('Customize'),
      expanded: false,
      controlSetRows: [
        ['color_scheme'],
        [
          {
            name: 'min_pie_radius',
            config: {
              type: 'TextControl',
              isInt: true,
              label: t('Minimum pie radius (px)'),
              default: DEFAULT_MIN_PIE_RADIUS,
            },
          },
        ],
        [
          {
            name: 'max_pie_radius',
            config: {
              type: 'TextControl',
              isInt: true,
              label: t('Maximum pie radius (px)'),
              default: DEFAULT_MAX_PIE_RADIUS,
            },
          },
        ],
        [
          {
            name: 'show_legend',
            config: {
              type: 'CheckboxControl',
              label: t('Show legend'),
              default: true,
            },
          },
        ],
        [
          {
            name: 'show_tooltip',
            config: {
              type: 'CheckboxControl',
              label: t('Show hover tooltip'),
              default: true,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
