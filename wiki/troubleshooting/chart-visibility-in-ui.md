# Troubleshooting: Chart Visibility in UI

_Last reviewed: 2026-04-24_

Use this when a chart is missing from Explore/Dashboard, shows an error placeholder, or renders with no data.

## 1) Asset-level checks

- Confirm the chart exists in `assets/charts/*.yaml`.
- Confirm `metadata.key` and `spec.vizType` are valid.
- Confirm `spec.datasetRef` points to an existing dataset asset.

## 2) Dataset-level checks

- Confirm dataset YAML exists in `assets/datasets/*.yaml`.
- Verify table/view actually exists in analytics database.
- Verify expected columns referenced by chart controls are present.

## 3) Reconciler checks

```bash
docker compose logs --tail=200 superset-runtime-seed
```

Look for messages about:
- missing dependency refs,
- API failures creating/updating chart,
- skipped assets due to feature flags.

## 4) Superset service checks

```bash
docker compose logs --tail=200 superset
```

Watch for:
- unknown viz types,
- permission errors,
- SQL execution errors.

## 5) Plugin/extension-specific checks

For dynamic plugins:

- bundle exists and is served from expected static URL,
- `DYNAMIC_PLUGINS` flag state matches expectation,
- plugin asset was not skipped by preflight.

For extensions:

- `.supx` bundle exists in `extensions/bundles/`,
- extension registration/apply step succeeded in logs.

## 6) Data presence checks

When chart renders empty without explicit error, validate source row counts directly in database. Missing data is often a seed/view issue rather than a chart issue.

## 7) Final sanity checks

- Hard refresh browser (clear cached JS for plugin changes).
- Verify user role has access to dataset + dashboard.
- Open chart in Explore mode to isolate dashboard layout issues.
