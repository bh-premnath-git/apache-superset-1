export const DEFAULT_MIN_PIE_RADIUS = 6;
export const DEFAULT_MAX_PIE_RADIUS = 22;

// Path Superset's runtime image serves india-districts.geojson from
// (see Dockerfile — the file is COPYed to /app/superset/static/assets/).
// Plugin code falls back to this when formData omits the URL so the
// chart works out of the box on the bundled deployment.
export const DEFAULT_GEOJSON_URL = '/static/assets/india-districts.geojson';

/** Fallback palette matching the LCA segment colors used elsewhere in the repo. */
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  R1: '#fde9d4',
  R2: '#f6b678',
  R3: '#e8772e',
  R4: '#8a3d0c',
  U1: '#dbe4f5',
  U2: '#7f9bdc',
  U3: '#2f4a8a',
};

export const FALLBACK_PALETTE = [
  '#5AC189',
  '#FF7F44',
  '#666666',
  '#E04355',
  '#FCC700',
  '#A868B7',
  '#3CCCCB',
];
