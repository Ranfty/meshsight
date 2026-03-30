import { describe, it, expect } from 'vitest';
import { fsplDb, diffractionLossDb } from './propagation';

describe('fsplDb', () => {
  it('returns ~91.2 dB at 1 km, 868 MHz', () => {
    // Hand calc: 20×log10(1) + 20×log10(868) + 32.44 = 0 + 58.77 + 32.44 = 91.21
    expect(fsplDb(1, 868)).toBeCloseTo(91.21, 0);
  });

  it('returns ~105.2 dB at 5 km, 868 MHz', () => {
    // Hand calc: 20×log10(5) + 58.77 + 32.44 = 13.98 + 91.21 = 105.19
    expect(fsplDb(5, 868)).toBeCloseTo(105.19, 0);
  });

  it('increases with distance', () => {
    expect(fsplDb(10, 868)).toBeGreaterThan(fsplDb(5, 868));
  });

  it('increases with frequency', () => {
    expect(fsplDb(5, 915)).toBeGreaterThan(fsplDb(5, 868));
  });

  it('returns 0 for zero or negative distance', () => {
    expect(fsplDb(0, 868)).toBe(0);
    expect(fsplDb(-1, 868)).toBe(0);
  });
});

describe('diffractionLossDb', () => {
  it('returns 0 dB for clear path (positive clearance larger than Fresnel radius)', () => {
    // fresnelClearanceM > fresnelRadiusM → v < -1 → 0 dB
    const loss = diffractionLossDb(10, 5);
    expect(loss).toBe(0);
  });

  it('returns 0 dB for deeply clear path', () => {
    const loss = diffractionLossDb(100, 10);
    expect(loss).toBe(0);
  });

  it('returns ~6 dB at grazing (clearance = 0)', () => {
    const loss = diffractionLossDb(0, 10);
    expect(loss).toBeCloseTo(6, 0);
  });

  it('returns positive loss for obstructed path (negative clearance)', () => {
    const loss = diffractionLossDb(-5, 5);
    expect(loss).toBeGreaterThan(0);
  });

  it('returns more loss for deeper obstruction', () => {
    const shallow = diffractionLossDb(-2, 5);
    const deep = diffractionLossDb(-10, 5);
    expect(deep).toBeGreaterThan(shallow);
  });

  it('returns 0 for zero Fresnel radius', () => {
    expect(diffractionLossDb(-5, 0)).toBe(0);
  });
});
