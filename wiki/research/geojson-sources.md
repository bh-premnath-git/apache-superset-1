# Research: India Districts GeoJSON Sources

## Current File

**File**: `india-districts.geojson` (repo root)
**Size**: ~34.5 MB
**Deployment**: Copied to `/app/superset/static/assets/india-districts.geojson` in Docker image

## Primary Data Source

### udit-001/india-maps-data

**Repository**: https://github.com/udit-001/india-maps-data  
**License**: CC BY 2.5 IN (India Government Open Data License)  
**Coverage**: Census 2011 district boundaries for all Indian states/UTs

**Why selected**:
- Accurate Census 2011 codes matching NSSO survey data
- Clean GeoJSON format
- Matches `NAME_1` (state) and `NAME_2` (district) property conventions
- Used by `district_pie_unified` chart for feature matching

**Properties used**:
```json
{
  "properties": {
    "NAME_1": "Bihar",
    "NAME_2": "Patna"
  }
}
```

---

## Alternative Reference Sources

### geo2day.com

**URL**: https://geo2day.com/asia/india.html  
**Type**: Geographic reference and visualization  
**Use**: Cross-validation of coordinate systems and projection parameters

### Datameet Maps of India

**Repository**: https://github.com/datameet/maps  
**License**: ODbL (Open Database License)  
**Coverage**: Community-maintained Indian administrative boundaries

**Why referenced**:
- Community-verified accuracy
- Regular updates for boundary changes
- Alternative when official sources unavailable

---

## Official Government Sources

### Census of India 2011

**URL**: https://censusindia.gov.in/2011census/hlo/pca/pdfs  
**Publisher**: Office of the Registrar General & Census Commissioner, India  
**Official documentation**: [Census Handbook](https://censusindia.gov.in/nada/index.php/catalog/11364)

**Data characteristics**:
- Census 2011 district codes (used in `district_code` column)
- 640 districts (as of 2011)
- Standardized naming conventions

### Survey of India

**URL**: https://www.surveyofindia.gov.in/  
**Authority**: National mapping agency

**Official documentation**: [Open Series Maps](https://www.surveyofindia.gov.in/osm)

---

## Technical Implementation

### Feature Key Matching

The `state_district_pies` plugin matches data rows to GeoJSON features using:

| Data Column | GeoJSON Property | Match Strategy |
|-------------|------------------|----------------|
| `state_label` | `NAME_1` | Normalized string comparison |
| `district_name` | `NAME_2` | Normalized string comparison |

### Centroid Computation

For district pie positioning, centroids are computed from GeoJSON polygons using area-weighted formula:

```
Cx = Σ(xi × Ai) / ΣAi
Cy = Σ(yi × Ai) / ΣAi
```

Where:
- `xi, yi`: Polygon vertex coordinates
- `Ai`: Polygon area (shoelace formula)

**Reference**: [Wikipedia - Centroid of a polygon](https://en.wikipedia.org/wiki/Centroid#Of_a_polygon)

---

## Projection Handling

### Source Data

- **Original CRS**: WGS 84 (EPSG:4326)
- **Coordinates**: [longitude, latitude] in decimal degrees

### Rendering

- **Display projection**: Web Mercator (EPSG:3857) via D3-geo
- **Fitting**: `d3.geoMercator().fitSize()` to chart dimensions

**Official D3 documentation**: [d3-geo](https://d3js.org/d3-geo)

---

## Licensing Summary

| Source | License | Commercial Use | Attribution |
|--------|---------|----------------|-------------|
| udit-001/india-maps-data | CC BY 2.5 IN | Yes | Required |
| Datameet Maps | ODbL | Yes | Required |
| Census of India | Public Domain (Govt) | Yes | Not required |
| GADM | Academic/Commercial licenses | Varies | Required |

---

## Maintenance Notes

- Check for boundary changes (new districts post-2011)
- Verify coordinate accuracy against Survey of India toposheets
- Update centroid table when GeoJSON changes
- Validate feature matching after updates

## Related Documentation

- [Database Seeding](../runtime/seed-database.md)
- [District Centroids](../runtime/database-seeding.md)
