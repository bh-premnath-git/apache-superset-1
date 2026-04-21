# dataset.household.hh_master

## Purpose

Household survey dataset over the Postgres table `household.hh_master`.

This is the main dataset for the household analysis part of the repository.

## Source of truth
- File: `assets/datasets/hh_master.yaml`
- Kind: `Dataset`
- Runtime name: `hh_master`

## Dependencies
- `db.analytics`

## Physical table
- database: analytics DB behind `db.analytics`
- schema: `household`
- table: `hh_master`

## Declared metrics
- `count`
- `weighted_count`
- `avg_hh_size`
- `avg_head_age`
- `total_cereal_val`
- `total_dairy_val`
- `total_vegetables_val`
- `total_pulses_val`
- `total_egg_fish_meat_val`
- `avg_mean_years_edu`

## Historical debugging notes

This dataset was a major debugging focus.

### Earlier failure mode
The YAML was valid, but dataset creation failed because the underlying Postgres table was not yet correctly loaded.

### Final resolved state
- `household.hh_master` exists
- the CSV import succeeded
- table row count reached `261953`
- the Superset dataset reconciled successfully

## Current notable downstream consumers
- `chart.household.state_map` — India state map with household counts
- `chart.household.rural_segment_comparison` — Rural segments comparison table

## Data source context

This is **Indian National Sample Survey (NSS)** household data — India's official household survey system conducted by the Ministry of Statistics.

### Geographic hierarchy
- `State` / `State_label` — Indian states and union territories (codes 1-35)
- `District` — District-level codes within states
- `NSS_Region` — NSS regional divisions
- `Stratum` / `Sub_stratum` — Sampling strata for survey design
- `FSU_Serial_No` — First Stage Unit (village/urban block identifier)

### Key Indian classifications
- `Household_Type` — Economic categories: Rural Self-Employed, Casual Labour, Regular Wage, etc.
- `Social_Group_of_HH_Head` — SC/ST/OBC/General classifications
- `Religion_of_HH_Head` — Religious demographics
- `Land_Ownership` — Land ownership status
- `Ration_Card_Type` — PDS (Public Distribution System) card types

### Welfare schemes tracked
- `Benefitted_From_PMGKY` — Pradhan Mantri Garib Kalyan Yojana
- `Ayushman_beneficiary` — Ayushman Bharat health insurance
- `LPG_subsidy_received` — Ujjwala LPG subsidy
- `Free_electricity` — Electricity subsidy programs
- `Ration_*` — Food subsidy via PDS (rice, wheat, pulses, oil, etc.)

## Notes on column quality
This table includes many wide survey columns, label columns, nullable values, and imported CSV semantics such as `NA`. Any future schema evolution should assume data hygiene issues are possible.

## Related files
- `assets/datasets/hh_master.yaml`
- `seed/pg/002_household_hh_master.sql`
- `seed/pg/HH.master.csv`

## Related pages
- [Database Seeding](../runtime/database-seeding.md)
- [chart.household.rural_segment_comparison](chart.household.rural_segment_comparison.md)
- [Chart Visibility in UI](../troubleshooting/chart-visibility-in-ui.md)
