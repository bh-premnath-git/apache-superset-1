import { lookupSegmentDescription } from '../src/data/segmentDescriptions';

describe('lookupSegmentDescription', () => {
  const map = {
    R1: { title: 'Rural Tier 1', summary: 'connected' },
    U1: { title: 'Urban Tier 1' },
  };

  it('returns the exact-case match', () => {
    expect(lookupSegmentDescription(map, 'R1').title).toBe('Rural Tier 1');
  });

  it('falls back to case-insensitive lookup', () => {
    expect(lookupSegmentDescription(map, 'r1').title).toBe('Rural Tier 1');
  });

  it('returns a stub when the code is unknown', () => {
    const out = lookupSegmentDescription(map, 'X9');
    expect(out.title).toBe('X9');
    expect(out.summary).toMatch(/no description/i);
  });
});
