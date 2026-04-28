# Research: Plugins vs Extensions

## Context in this repository

- Custom chart plugin (`state_district_pies`) is deployed as a statically bundled frontend plugin.
- Chatbot functionality is scaffolded as a Superset extension (`.supx`) and treated as experimental.

## Plugin path (current production path)

### Pros

- Deterministic load at startup (bundled in SPA).
- No runtime dynamic plugin API dependency.
- Full control over chart behaviors and metadata (including drill capabilities).

### Cons

- Requires frontend rebuild to ship changes.
- Larger app bundle when plugin grows.

## Extension path (current experimental path)

### Pros

- Decoupled deployment model (`.supx` bundles).
- Can encapsulate frontend + backend extension logic.

### Cons

- Upstream lifecycle is still development-stage in Superset 6.x.
- API/loader behavior may vary by version.

## Recommendation

- Keep critical data-visual functionality on statically registered plugins.
- Keep extensions for non-critical or exploratory capabilities until upstream extension APIs stabilize.
