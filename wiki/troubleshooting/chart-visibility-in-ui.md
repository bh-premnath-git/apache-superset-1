# Troubleshooting: Chart Visibility in UI

## Symptom: Dashboard tile spins or chart not visible

### Checks

1. Confirm `superset` is healthy:

```bash
docker compose ps
docker compose logs superset --tail 200
```

2. Confirm assets were reconciled:

```bash
docker compose logs superset-runtime-seed --tail 300
```

3. Confirm chart exists in YAML and reconciler references are valid (`datasetRef`, `chartRefs`).

## Symptom: Plugin chart not rendering

### Checks

- Verify plugin source exists at `superset-plugins/plugin-chart-state-district-pies/`.
- Rebuild image after plugin edits:

```bash
docker compose build superset
docker compose up -d superset
```

- Ensure GeoJSON file is served from `/static/assets/india-districts.geojson` in the running container image.

## Symptom: Clicking district triggers dashboard filter reset

Cause: click handler emits dashboard filter event; dashboard refresh resets local drill state.

Resolution: keep district drill-down local in plugin handler unless cross-filter behavior is intentionally required.

## Symptom: `superset-init` exits with import errors

Example: SQLAlchemy API mismatch (`eagerload` import error).

Resolution: keep SQLAlchemy pinned to Superset-compatible range in `Dockerfile` (`sqlalchemy<2.0,>=1.4`) and rebuild image.
