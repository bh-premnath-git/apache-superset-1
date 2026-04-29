/**
 * Canonical key normalisation for state/district names.
 *
 * GeoJSON sources and analytics warehouses occasionally disagree on the
 * spelling of the same place ("Orissa" vs "Odisha", "Hazaribag" vs
 * "Hazaribagh"). Both ends route through `normalizeKey` so a single alias
 * map controls reconciliation, instead of every component reinventing
 * `s.toLowerCase().trim()` and drifting on edge cases.
 */
export const DISTRICT_ALIASES: Record<string, string> = {
  'purba champaran': 'east champaran',
  'pashchim champaran': 'west champaran',
  bhabua: 'kaimur',
  'purba singhbhum': 'east singhbhum',
  'pashchim singhbhum': 'west singhbhum',
  hazaribag: 'hazaribagh',
  'saraikela kharsawan': 'saraikela-kharsawan',
  'east nimar': 'khandwa',
  'west nimar': 'khargone',
  'tamil nadu': 'tamilnadu',
  'jammu and kashmir': 'jammu & kashmir',
  chhattisgarh: 'chattisgarh',
  orissa: 'odisha',
  'uttar pradesh': 'uttar prdesh',
  'uttra pradesh': 'uttar prdesh',
  uttaranchal: 'uttrakhand',
  uttranchel: 'uttrakhand',
  // State-level aliases to bridge GeoJSON/SQL naming mismatches
  'a and n islands (u.t.)': 'andaman and nicobar',
  'andaman & nicobar': 'andaman and nicobar',
  'chandigarh(u.t.)': 'chandigarh',
  'dadra & nagar haveli and daman & diu': 'daman and diu',
  'dadra and nagar haveli': 'daman and diu',
  'puducherry (u.t.)': 'puducherry',
  'ladakh (u.t.)': 'jammu & kashmir',
  'lakshadweep (u.t.)': 'lakshadweep',
  // Telangana districts map to Andhra Pradesh in pre-2014 GeoJSON
  telangana: 'andhra pradesh',
};

export function normalizeKey(s: string): string {
  const key = s.toLowerCase().trim();
  return DISTRICT_ALIASES[key] ?? key;
}
