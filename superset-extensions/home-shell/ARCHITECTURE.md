# Extension Architecture: home-shell

## Overview

Replaces Superset's default Welcome page with a Pathways-style
(`https://withpathways.org`) shell:

- **Left sidebar** — three sections: Overview, Comparison tool, Prevalence map
- **Top nav** — kept intact (we mount BELOW the Superset header bar)
- **Login required** — the welcome route is already auth-gated by Superset

The shell is mounted as a fixed-position overlay only on the welcome route
(`/superset/welcome/` and `/`). It uses dummy data today and is wired to be
replaced with calls to existing India-segmentation datasets/charts later.

## Directory Structure

```
home-shell/
├── frontend/
│   ├── src/
│   │   └── index.tsx       # Module Federation entry; mounts the shell
│   ├── package.json
│   ├── tsconfig.json
│   └── webpack.config.js   # Builds remoteEntry.js
├── backend/
│   ├── pyproject.toml
│   └── src/my_org/home_shell/entrypoint.py   # Stub API for future data
├── extension.json
└── Dockerfile.builder      # Bundles to .supx
```

## Build & Discovery

```
docker compose up extension-builder-home-shell
  → emits extensions/bundles/my-org.home-shell-0.1.0.supx
  → mounted into superset and superset-runtime-seed at /app/extensions/
  → reconciler_entrypoint.sh discovers *.supx files and exports
    HOME_SHELL_SUPX_PATH automatically (filename → ENV convention)
```

Requires `ENABLE_EXTENSIONS: True` in `superset_config.py` (already set).

## Runtime Mount Strategy

Same Module Federation contract as `dashboard-chatbot`:
- Manifest container name `myOrg_homeShell` (publisher+name camelCase)
- Default export `activate()` mounts the shell on load
- Mount target is appended to `document.body`; CSS uses `position: fixed`
  with `top: 64px` so Superset's nav remains visible and clickable

The shell registers a `popstate` + `pushState` interceptor to detect SPA
navigation. It only renders when `location.pathname` matches the welcome
routes; otherwise it unmounts and hides.

## Future wiring (deferred)

- Overview cards → `assets/charts/district_pie_unified.yaml`
- Comparison tool → `three_state_comparison` plugin (already registered)
- Prevalence map → `india-districts.geojson` + `lca_state_district_segment_geo`
  dataset; toggle for state vs district granularity
