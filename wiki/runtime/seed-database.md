# Database Seeding Reference

## Overview

The analytics database (`analytics-db`) is seeded on first initialization via PostgreSQL's `docker-entrypoint-initdb.d` mechanism. This runs before the database accepts external connections.

## Seed Files (in execution order)

### 1. `001_household_hh_master.sql`

**Purpose**: Creates base schema and loads household survey data.

**Key operations**:
- Creates `household` schema
- Defines `household.hh_master` table with survey columns
- Imports `HH.master.csv` (Git LFS) via `COPY`

**Official documentation**: [PostgreSQL COPY](https://www.postgresql.org/docs/current/sql-copy.html)

---

### 2. `002_lca_segment_views.sql`

**Purpose**: Creates Living Conditions Approach (LCA) segment classification views.

**Technical basis**: LCA methodology for welfare segmentation based on digital access, asset ownership, and connectivity indicators.

**Views created**:
- `household.vw_hh_segments` - household-level segment assignment
- `household.vw_segment_distribution` - aggregate segment counts
- `household.vw_state_segment_distribution` - state-level aggregation

**Segment classification**:
- **Rural**: R1 (best), R2, R3, R4 (most constrained)
- **Urban**: U1 (best), U2, U3 (most constrained)

**Official references**:
- [World Bank Living Standards Measurement](https://www.worldbank.org/en/programs/lsms)
- [India NSSO Survey Methodology](https://mospi.gov.in/national-sample-survey-office-nsso)

---

### 3. `003_district_centroids.sql`

**Purpose**: Provides district centroid coordinates for map visualizations.

**Data source**: 
- **Primary**: [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data) - Census 2011 district boundaries
- **License**: CC BY 2.5 IN (India Government Open Data License)
- **Method**: Shoelace area-weighted centroid formula on largest polygon ring

**Alternative reference sources**:
- [geo2day.com/asia/india.html](https://geo2day.com/asia/india.html) - geographic reference
- [Datameet Maps of India](https://github.com/datameet/maps) - community-verified boundaries

**Official documentation**:
- [Census of India 2011](https://censusindia.gov.in/2011census/hlo/pca/pdfs)
- [GADM Database](https://gadm.org/data.html) - Global Administrative Boundaries

**Centroid computation**:
```
Centroid = (Σ(xi × Ai) / ΣAi, Σ(yi × Ai) / ΣAi)
Where Ai = polygon area, (xi, yi) = polygon vertex
```

**Research reference**:
- [Polygon Centroid Algorithms](https://en.wikipedia.org/wiki/Centroid#Of_a_polygon)

---

### 4. `005_mpce_by_segment.sql`

**Purpose**: Creates monthly per capita expenditure (MPCE) analysis views.

**Official reference**:
- [NSSO Household Consumption Expenditure](https://mospi.gov.in/web/nsso/schedule-1-0-type-of-houselivestock-enterprise-non-directory-non-directory-establishment-and-own-account)
- [India MPCE Methodology](https://mospi.gov.in/documents/213904/0/Instructions+to+Field+Staff+for+data+collection+on+schedule+1.0.pdf)

---

## Data Files

### `HH.master.csv`

**Size**: ~317 MB (Git LFS tracked)
**Source**: Simulated/anonymized household survey data
**Format**: CSV with header matching `hh_master` table schema

**Official LFS documentation**: [Git LFS](https://git-lfs.github.com/)

---

## Troubleshooting

### Seed data not loading

1. Verify Git LFS pulled the CSV:
   ```bash
   git lfs ls-files
   ls -lh seed/pg/HH.master.csv
   ```

2. Check postgres init logs:
   ```bash
   docker compose logs analytics-db | grep -E "(init|COPY|ERROR)"
   ```

3. Manual re-seed (destructive):
   ```bash
   docker compose stop analytics-db
   docker volume rm apache-superset-1_analytics-db-data
   docker compose up -d analytics-db
   ```

---

## External Data References

| Resource | URL | Purpose |
|----------|-----|---------|
| udit-001/india-maps | https://github.com/udit-001/india-maps-data | District boundaries |
| Geo2Day India | https://geo2day.com/asia/india.html | Geographic reference |
| Datameet Maps | https://github.com/datameet/maps | Community boundaries |
| Census 2011 | https://censusindia.gov.in | Official demographic data |
| GADM | https://gadm.org | Global admin boundaries |
