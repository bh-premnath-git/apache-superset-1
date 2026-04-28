/** Compact human-readable number formatting shared by tooltip + detail view. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function formatPercent(value: number, total: number, digits = 1): string {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return '0%';
  return `${((value / total) * 100).toFixed(digits)}%`;
}
