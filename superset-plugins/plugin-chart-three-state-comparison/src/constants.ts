/**
 * Segment colors matching the LCA palette used by state_district_pies.
 * Keeping the same hex values ensures dashboard visual consistency.
 */
export const SEGMENT_COLORS: Record<string, string> = {
  R1: '#fde9d4',
  R2: '#f6b678',
  R3: '#e8772e',
  R4: '#8a3d0c',
  U1: '#dbe4f5',
  U2: '#7f9bdc',
  U3: '#2f4a8a',
};

export const DEFAULT_STATE_ORDER = ['Bihar', 'Madhya Pradesh', 'Jharkhand'];

export const DEFAULT_SEGMENT_ORDER = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'];

export const DEFAULT_SHOW_LEGEND = true;
export const DEFAULT_SHOW_PERCENTAGES = true;
export const DEFAULT_LEGEND_POSITION: 'bottom' | 'right' = 'bottom';
export const DEFAULT_PERCENT_DECIMALS = 0;
export const DEFAULT_LABEL_THRESHOLD = 5;
