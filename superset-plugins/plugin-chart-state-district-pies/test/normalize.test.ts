import { normalizeKey } from '../src/data/normalize';

describe('normalizeKey', () => {
  it('lower-cases and trims plain values', () => {
    expect(normalizeKey('  Bihar ')).toBe('bihar');
  });

  it('reconciles known aliases across both sides', () => {
    expect(normalizeKey('Orissa')).toBe('odisha');
    expect(normalizeKey('Hazaribag')).toBe('hazaribagh');
    expect(normalizeKey('Purba Champaran')).toBe('east champaran');
  });

  it('passes through unknown keys unchanged (after lower/trim)', () => {
    expect(normalizeKey('Madhya Pradesh')).toBe('madhya pradesh');
  });
});
