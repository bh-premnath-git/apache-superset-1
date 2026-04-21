# Chart Visibility in UI

## Symptom

A dataset, chart, or dashboard YAML asset exists in the repo, but the object does not appear in the Superset UI.

## Primary places to check

1. `superset-runtime-seed` logs
2. analytics Postgres contents
3. asset references in YAML
4. current reconciler behavior

## Common root causes in this repo

### 1. Underlying Postgres table is missing
A dataset asset can be valid while the physical table is absent.

### 2. Table exists but has not been loaded correctly
This happened with `household.hh_master` before the CSV import fixes were completed.

### 3. New seed SQL was added after DB volume initialization
Postgres does not auto-apply new `/docker-entrypoint-initdb.d` files to an already-initialized volume.

### 4. Upstream asset failed
Charts depend on datasets; dashboards depend on charts.

### 5. Plugin or extension expectations are incorrect
Plugin and extension assets can be skipped intentionally if prerequisites are not configured.

## Important project-specific lessons

### Earlier reconcile bug
One failed dataset used to block all charts of kind `Chart`, even unrelated ones. That behavior was fixed so failures are now tracked per asset.

### Improved HTTP error visibility
The Superset client was improved to include error response bodies, making 422 and validation failures easier to diagnose.

## Practical debug checklist

- Check `docker logs superset-runtime-seed --tail 100`
- Verify table existence with `psql`
- Verify row counts
- Confirm `databaseRef`, `datasetRef`, and `chartRefs`
- Confirm the dataset/chart/dashboard names in Superset UI filters
- Refresh the browser and verify permissions if logs say creation succeeded

## Known good signals
Examples of healthy reconcile logs:
- dataset created
- metrics synced
- chart created or updated
- dashboard created or already exists
- reconcile complete with `0 failed`

## Handlebars-specific issues

### Symptom: CSP error about 'unsafe-eval'
**Error:** `Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script`

**Fix:** Add `TALISMAN_CONFIG` with `'unsafe-eval'` in `script-src` in `superset_config.py`.

### Symptom: CSS renders as plain text
**Error:** The style block appears as visible text on the chart instead of being applied.

**Fix:** Configure HTML sanitization to allow `<style>` tags:
```python
FEATURE_FLAGS = {
    "ESCAPE_MARKDOWN_HTML": False,
    "HTML_SANITIZATION": True,
}
HTML_SANITIZATION_SCHEMA_EXTENSIONS = {
    "attributes": {"*": ["style", "className", "class"]},
    "tagNames": ["style"],
}
```

See [apache/superset#25205](https://github.com/apache/superset/issues/25205) and [apache/superset#30381](https://github.com/apache/superset/issues/30381).

## API / CSRF issues

### Symptom: CSRF session token missing on API calls
**Error:** `400 Bad Request: The CSRF session token is missing.`

This happens when using the REST API with JWT Bearer tokens but Flask-WTF CSRF protection is enabled.

**Fix in superset_config.py:**
```python
WTF_CSRF_ENABLED = True
WTF_CSRF_CHECK_DEFAULT = False  # Exempt API from CSRF
```

This allows programmatic API access while keeping CSRF for browser forms.

## Related pages
- [Reconciler Engine](../architecture/reconciler-engine.md)
- [Database Seeding](../runtime/database-seeding.md)
- [dataset.household.hh_master](../assets/dataset.household.hh_master.md)
