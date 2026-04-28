import { splitWedges } from '../src/data/splitWedges';
import type { DistrictRow } from '../src/types';

function row(wedges: { category: string; value: number }[]): DistrictRow {
  return {
    stateKey: 'Bihar',
    districtKey: 'Patna',
    wedges,
    totalWeight: wedges.reduce((s, w) => s + w.value, 0),
  };
}

describe('splitWedges', () => {
  it('uses precomputed rural/urban arrays when provided', () => {
    const r: DistrictRow = {
      ...row([
        { category: 'R1', value: 10 },
        { category: 'U1', value: 4 },
      ]),
      ruralWedges: [{ category: 'R1', value: 10 }],
      urbanWedges: [{ category: 'U1', value: 4 }],
    };
    const out = splitWedges(r, ['R1', 'R2'], ['U1']);
    expect(out.rural.map(w => w.category)).toEqual(['R1']);
    expect(out.urban.map(w => w.category)).toEqual(['U1']);
    expect(out.otherTotal).toBe(0);
  });

  it('reorders to match the configured category order', () => {
    const r: DistrictRow = {
      ...row([
        { category: 'R3', value: 1 },
        { category: 'R1', value: 2 },
        { category: 'R2', value: 3 },
      ]),
      ruralWedges: [
        { category: 'R3', value: 1 },
        { category: 'R1', value: 2 },
        { category: 'R2', value: 3 },
      ],
      urbanWedges: [],
    };
    const out = splitWedges(r, ['R1', 'R2', 'R3'], ['U1']);
    expect(out.rural.map(w => w.category)).toEqual(['R1', 'R2', 'R3']);
  });

  it('falls back to flat wedges and tracks "other" total', () => {
    const r = row([
      { category: 'R1', value: 10 },
      { category: 'U1', value: 4 },
      { category: 'X9', value: 7 },
    ]);
    const out = splitWedges(r, ['R1'], ['U1']);
    expect(out.rural.map(w => w.category)).toEqual(['R1']);
    expect(out.urban.map(w => w.category)).toEqual(['U1']);
    expect(out.otherTotal).toBe(7);
  });

  it('routes wedges outside both groups into otherTotal', () => {
    const r = row([
      { category: 'R1', value: 10 },
      { category: 'R2', value: 5 },
      { category: 'R9', value: 100 },
      { category: 'R7', value: 50 },
    ]);
    const out = splitWedges(r, ['R1', 'R2'], []);
    expect(out.rural.map(w => w.category)).toEqual(['R1', 'R2']);
    expect(out.urban).toEqual([]);
    expect(out.otherTotal).toBe(150);
  });

  it('preserves precomputed wedges that include extras outside the order list', () => {
    const r: DistrictRow = {
      ...row([
        { category: 'R1', value: 10 },
        { category: 'R7', value: 50 },
      ]),
      ruralWedges: [
        { category: 'R1', value: 10 },
        { category: 'R7', value: 50 },
      ],
      urbanWedges: [],
    };
    const out = splitWedges(r, ['R1', 'R2'], []);
    expect(out.rural.map(w => w.category)).toEqual(['R1', 'R7']);
    expect(out.otherTotal).toBe(0);
  });
});
