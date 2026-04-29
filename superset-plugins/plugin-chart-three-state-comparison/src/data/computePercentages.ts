/**
 * Adjust an array of percentages so they sum to exactly 100 using the
 * largest-remainder method (Hare–Niemeyer). This avoids display artifacts
 * where labels add up to 99% or 101%.
 */
export function normalizePercentages(
  values: number[],
  decimals: number = 0,
): number[] {
  if (values.length === 0) return [];
  const factor = Math.pow(10, decimals);
  const floored = values.map(v => Math.floor(v * factor) / factor);
  const sum = floored.reduce((a, b) => a + b, 0);
  const remainder = Math.round((100 - sum) * factor);

  if (remainder <= 0) return floored;

  // Sort by fractional part descending
  const indexed = values.map((v, i) => ({
    index: i,
    fractional: v * factor - Math.floor(v * factor),
  }));
  indexed.sort((a, b) => b.fractional - a.fractional);

  const result = [...floored];
  const step = 1 / factor;
  for (let i = 0; i < remainder && i < indexed.length; i++) {
    result[indexed[i].index] += step;
  }
  return result.map(v => Math.round(v * factor) / factor);
}
