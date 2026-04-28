import type { DistrictRow, Wedge } from '../types';

export interface SplitResult {
  rural: Wedge[];
  urban: Wedge[];
  /** Sum of any wedges that fall outside both configured groups. */
  otherTotal: number;
}

/**
 * Split a district's wedges into rural / urban buckets and an "other"
 * residual. Used by the detail view; pure so it can be unit-tested
 * without mounting React.
 */
export function splitWedges(
  row: DistrictRow,
  ruralCategories: string[],
  urbanCategories: string[],
): SplitResult {
  if (row.ruralWedges && row.urbanWedges) {
    const accountedFor = new Set<string>([
      ...row.ruralWedges.map(w => w.category),
      ...row.urbanWedges.map(w => w.category),
    ]);
    const otherTotal = row.wedges
      .filter(w => !accountedFor.has(w.category))
      .reduce((s, w) => s + w.value, 0);
    return {
      rural: orderBy(row.ruralWedges, ruralCategories),
      urban: orderBy(row.urbanWedges, urbanCategories),
      otherTotal,
    };
  }

  const ruralSet = new Set(ruralCategories);
  const urbanSet = new Set(urbanCategories);
  const rural: Wedge[] = [];
  const urban: Wedge[] = [];
  let otherTotal = 0;
  for (const w of row.wedges) {
    if (ruralSet.has(w.category)) rural.push(w);
    else if (urbanSet.has(w.category)) urban.push(w);
    else otherTotal += w.value;
  }
  return {
    rural: orderBy(rural, ruralCategories),
    urban: orderBy(urban, urbanCategories),
    otherTotal,
  };
}

/**
 * Stable ordering: follow the configured category list, then any extras
 * by descending value so unexpected codes don't get hidden at the tail.
 */
function orderBy(wedges: Wedge[], order: string[]): Wedge[] {
  const orderIndex = new Map(order.map((c, i) => [c, i]));
  return [...wedges].sort((a, b) => {
    const ia = orderIndex.get(a.category) ?? Number.POSITIVE_INFINITY;
    const ib = orderIndex.get(b.category) ?? Number.POSITIVE_INFINITY;
    if (ia !== ib) return ia - ib;
    return b.value - a.value;
  });
}
