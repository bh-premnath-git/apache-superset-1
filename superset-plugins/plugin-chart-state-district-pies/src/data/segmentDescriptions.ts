import type { SegmentDescription } from '../constants';

/**
 * Look up a segment's description with safe fallback. Used by
 * `SegmentModal` so the modal opens even for codes the operator hasn't
 * configured yet — instead of breaking, the modal carries a stub note
 * pointing at the control-panel field.
 */
export function lookupSegmentDescription(
  descriptions: Record<string, SegmentDescription>,
  code: string,
): SegmentDescription {
  if (descriptions[code]) return descriptions[code];

  // Case-insensitive secondary lookup so admins who type `r1` instead of
  // `R1` still see their copy. Exact-case wins above.
  const lower = code.toLowerCase();
  for (const [k, v] of Object.entries(descriptions)) {
    if (k.toLowerCase() === lower) return v;
  }

  return {
    title: code,
    summary:
      'No description configured for this segment. Add it via the chart ' +
      '"Segment descriptions" control panel field.',
  };
}
