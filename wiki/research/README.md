# Research

External material referenced when designing or operating this stack.

## Identity

- [Keycloak — OIDC clients](https://www.keycloak.org/docs/latest/server_admin/index.html#_oidc_clients)
- [Keycloak — Multi-realm strategies](https://www.keycloak.org/docs/latest/server_admin/index.html#_realms)
- [Authlib Flask client](https://docs.authlib.org/en/latest/client/flask.html) — used by Flask AppBuilder for OAuth
- [Flask AppBuilder authentication](https://flask-appbuilder.readthedocs.io/en/latest/security.html) — `AUTH_OAUTH`, custom security manager subclassing
- `bh-keycloak` repo — companion repo provides the actual Keycloak deployment, themes, and per-realm onboarding scripts

## Superset

- [Superset 6.x release notes](https://github.com/apache/superset/releases)
- [Superset configuration reference](https://superset.apache.org/docs/configuration/configuring-superset)
- [Dynamic plugins discussion #35870](https://github.com/apache/superset/issues/35870) — why we statically compile viz plugins
- [Extensions framework discussion #38607](https://github.com/apache/superset/discussions/38607) — current development-stage status

## Geographic data sources (used by viz plugins)

- [Census of India 2011](https://censusindia.gov.in/2011census/hlo/pca/pdfs)
- [Survey of India](https://www.surveyofindia.gov.in/)
- [NSSO methodology](https://mospi.gov.in/national-sample-survey-office-nsso)
- [World Bank LSMS](https://www.worldbank.org/en/programs/lsms)
- [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data) — CC BY 2.5 IN
- [Datameet Maps](https://github.com/datameet/maps) — ODbL
