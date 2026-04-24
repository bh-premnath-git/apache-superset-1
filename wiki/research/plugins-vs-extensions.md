# Research Note: Plugins vs Extensions

_Last reviewed: 2026-04-24_

## Summary

Both mechanisms are present in this repository, but they solve different problems:

- **Visualization plugin** (`superset-plugins/plugin-chart-state-district-pies`): adds a new chart `vizType`.
- **Extension** (`superset-extensions/dashboard-chatbot`): augments broader product/UI behavior via the extensions framework.

## When to choose a plugin

Choose a plugin when you need:

- a brand-new chart type,
- custom control panel options for chart authors,
- custom transform/render pipeline for chart data.

## When to choose an extension

Choose an extension when you need:

- dashboard/UI enhancements not tied to one chart type,
- cross-page behaviors,
- integration features that sit above chart rendering.

## Repo-specific status

- The dashboard currently works using built-in viz types for core use cases.
- The custom `state_district_pies` plugin exists as optional advanced capability.
- Chatbot extension packaging/build infrastructure exists and is staged through `extensions/bundles/`.

## Decision guideline

- If requirement is “new visual grammar for one chart,” start with plugin.
- If requirement is “new dashboard behavior/tooling,” start with extension.
- If both are needed, keep boundaries clean: plugin handles rendering; extension handles workflow/UI orchestration.
