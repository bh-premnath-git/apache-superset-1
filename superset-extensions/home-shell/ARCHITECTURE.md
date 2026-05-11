# Extension Architecture: home-shell

## Overview

Replaces Superset's default Welcome page with a Pathways-style
(`https://withpathways.org`) shell:

- **Left sidebar** — four sections: Overview, Comparison tool, Data browser, Prevalence map
- **Top nav** — kept intact (we mount BELOW the Superset header bar)
- **Login required** — the welcome route is already auth-gated by Superset

The shell is mounted as a fixed-position overlay only on the welcome route
(`/superset/welcome/` and `/`). All page content is served by the extension
backend at `/extensions/my-org/home-shell/` (see endpoints below); the
PrevalenceMap additionally loads `india-districts.geojson` from Superset's
static assets.

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

## Backend endpoints (all live)

All pages call the extension API mounted at `/extensions/my-org/home-shell/`:

- `GET /summary` — weighted households, segments observed, states/districts covered, per-state totals
- `GET /segments` — focus-state segment distribution (R1..U3)
- `GET /states/segments` — per-state segment mix
- `GET /states/<state>/districts` — per-district segment shares
- `GET /states/<state>/districts/<district>` — district detail KPIs
- `GET /mpce` — weighted mean MPCE per segment
- `GET /metrics/catalog` — indicator groups available to Comparison / Data browser
- `GET /metrics/values?metrics=…` — per-segment values for selected indicators

All queries run against the Superset-registered `Analytics Warehouse`
database against the `household` schema (`vw_hh_segments`,
`vw_state_segment_distribution`, `vw_state_district_segment_geo`,
`vw_mpce_by_segment`, `hh_master`).

## Known placeholders

- `DataBrowser` bar chart renders a symmetric error wedge derived from the
  share value itself — replace once the backend exposes a real standard
  error per segment.
