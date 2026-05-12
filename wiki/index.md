# Wiki Index

Top-level entry point for the Superset Control Plane documentation.

## Sections

- [Overview](overview.md) — what this repo is and how it is organized
- [Architecture](architecture/README.md) — services, networks, runtime topology
- [Runtime](runtime/README.md) — operations runbook
  - [Identity and Auth](runtime/identity-and-auth.md) — bh-keycloak integration details
- [Troubleshooting](troubleshooting/README.md) — common failures and fixes
  - [Keycloak login](troubleshooting/keycloak-login.md) — `Invalid parameter: redirect_uri` and friends
- [Reference](reference/README.md) — env vars and external links
- [Research](research/README.md) — external resources cited
- [Assets](assets/README.md) — declarative YAML assets reconciled into Superset
- [Change log](log.md) — significant changes to the stack

## Quick navigation by intent

| If you want to... | Go to |
|---|---|
| Bring the stack up locally | [README.md](../README.md) Quick Start |
| Understand the auth flow | [runtime/identity-and-auth.md](runtime/identity-and-auth.md) |
| Diagnose a login failure | [troubleshooting/keycloak-login.md](troubleshooting/keycloak-login.md) |
| Add a new chart/dataset/dashboard | [assets/README.md](assets/README.md) |
| Look up an env var | [reference/README.md](reference/README.md) |
