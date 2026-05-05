export type SegmentRow = { segment: string; share: number; mpce: number };

export const SEGMENTS: SegmentRow[] = [
  { segment: 'Aspirers',    share: 32.4, mpce: 1850 },
  { segment: 'Strivers',    share: 24.1, mpce: 2640 },
  { segment: 'Comfortable', share: 18.7, mpce: 3920 },
  { segment: 'Affluent',    share:  9.2, mpce: 6810 },
  { segment: 'Subsisters',  share: 15.6, mpce: 1120 },
];

export const STATES = [
  'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu', 'Karnataka',
  'West Bengal', 'Gujarat', 'Rajasthan', 'Madhya Pradesh',
  'Bihar', 'Andhra Pradesh', 'Telangana', 'Kerala',
];

// Deterministic pseudo-random so colors/shares are stable on re-render.
export function hashShare(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h % 100);
}
