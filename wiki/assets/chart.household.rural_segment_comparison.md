# chart.household.rural_segment_comparison

## Purpose

A custom Handlebars-based comparison table for rural household segments.

This is currently the key chart inside the Household Survey dashboard.

## Source of truth
- File: `assets/charts/rural_segment_comparison.yaml`
- Kind: `Chart`
- Runtime name: `Rural Segments Comparison`
- `vizType`: `handlebars`

## Upstream dependency
- `dataset.household.hh_master`

## Query behavior

### Filtering
- SQL filter: `"Sector" = 1`
- Scope: rural records only

### Grouping
The chart creates a computed `segment` grouping using a SQL `CASE` on `"Household_Type"`.

Current mapped segment labels include:
- Rural Self-Employed Agri
- Rural Self-Employed Non-Agri
- Rural Regular Wage
- Rural Casual Labour Agri
- Rural Casual Labour Non-Agri
- Rural Other
- Rural Unclassified

## Output style

This is not a standard chart. It renders a structured HTML table through Handlebars.

The table groups metrics into sections:
- Size
- Economic Condition
- Digital Connectivity
- Human Capital
- Welfare & Vulnerability

## Notable derived metrics
Examples:
- `size_pct`
- `food_spend_gt_50`
- `edu_spend_gt_5`
- `mcpe_inr`
- `family_internet_use`
- `high_online_connect`
- `no_digital_purchase`
- `scst_compos`
- `uhs_minors_gt_3`
- `hh_size_gt_6`
- `has_pmgky`
- `ayushman_card`
- `ration_card`

## Operational notes

Because this chart uses `vizType: handlebars`, it is more template-like than a standard Superset visual.

It is a good example of when custom presentation logic belongs in a chart asset even without using the dynamic plugin system.

## Required Superset configuration

Handlebars charts require specific `superset_config.py` settings to render properly:

### 1. CSP (Content Security Policy)
Handlebars compiles templates at runtime using `new Function()`, which requires `'unsafe-eval'`:

```python
TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    "content_security_policy": {
        "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        # ... other directives
    },
    "force_https": False,
}
```

### 2. HTML Sanitization
The chart's `styleTemplate` CSS is rendered as a `<style>` tag. Without proper configuration, the sanitizer strips it or renders it as plain text:

```python
FEATURE_FLAGS = {
    "ESCAPE_MARKDOWN_HTML": False,  # Don't escape HTML entities
    "HTML_SANITIZATION": True,       # Enable with overrides
}

HTML_SANITIZATION_SCHEMA_EXTENSIONS = {
    "attributes": {"*": ["style", "className", "class"]},
    "tagNames": ["style"],
}
```

See [apache/superset#25205](https://github.com/apache/superset/issues/25205) and [apache/superset#30381](https://github.com/apache/superset/issues/30381).

## Related files
- `assets/charts/rural_segment_comparison.yaml`
- `assets/dashboards/household_survey.yaml`

## Related pages
- [dataset.household.hh_master](dataset.household.hh_master.md)
- [dashboard.household.survey](dashboard.household.survey.md)
