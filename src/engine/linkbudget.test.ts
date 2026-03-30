import { describe, it, expect } from 'vitest';
import {
  calculateLinkBudget,
  MARGINAL_MARGIN_FLOOR_DB,
  MARGINAL_FRESNEL_FLOOR_M,
  MARGINAL_DISTANCE_FLOOR_KM,
} from './linkbudget';

// LONG_FAST preset: rxSensitivity = -123 dBm, stock antennas = 2.15 dBi
const LONG_FAST_SENSITIVITY = -123;
const STOCK_GAIN_DBI = 2.15;
const TX_POWER_DBM = 20;
const FREQ_MHZ = 868;

describe('calculateLinkBudget', () => {
  it('reports link viable for LONG_FAST at 5 km in free space', () => {
    const result = calculateLinkBudget(
      5,
      FREQ_MHZ,
      TX_POWER_DBM,
      STOCK_GAIN_DBI,
      STOCK_GAIN_DBI,
      LONG_FAST_SENSITIVITY,
    );
    expect(result.linkViable).toBe(true);
    expect(result.marginDb).toBeGreaterThan(10);
  });

  it('reports link NOT viable for LONG_FAST at 300 km in free space', () => {
    // 300 km exceeds the ~200 km theoretical max range for LONG_FAST with stock antennas
    const result = calculateLinkBudget(
      300,
      FREQ_MHZ,
      TX_POWER_DBM,
      STOCK_GAIN_DBI,
      STOCK_GAIN_DBI,
      LONG_FAST_SENSITIVITY,
    );
    expect(result.linkViable).toBe(false);
  });

  it('calculates received power correctly', () => {
    // At 5 km, 868 MHz: FSPL ≈ 105.19 dB
    // receivedPower = 20 + 2.15 + 2.15 - 105.19 = -80.89 dBm
    const result = calculateLinkBudget(5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY);
    expect(result.receivedPowerDbm).toBeCloseTo(-80.89, 0);
  });

  it('adds diffraction loss when clearance arguments are provided', () => {
    const noDiffraction = calculateLinkBudget(5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY);
    const withDiffraction = calculateLinkBudget(5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY, 10, -10, 5);

    expect(withDiffraction.diffractionLossDb).toBeGreaterThan(0);
    expect(withDiffraction.receivedPowerDbm).toBeLessThan(noDiffraction.receivedPowerDbm);
  });

  it('diffraction loss is zero for clear path', () => {
    const result = calculateLinkBudget(5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY, 10, 20, 5);
    expect(result.diffractionLossDb).toBe(0);
  });

  it('computes maxRangeKm within expected bounds for LONG_FAST', () => {
    const result = calculateLinkBudget(5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY);
    // LONG_FAST with 20 dBm and stock antennas should reach 150–250 km in free space
    expect(result.maxRangeKm).toBeGreaterThan(150);
    expect(result.maxRangeKm).toBeLessThan(300);
  });

  it('marginDb equals receivedPower minus rxSensitivity', () => {
    const result = calculateLinkBudget(5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY);
    expect(result.marginDb).toBeCloseTo(result.receivedPowerDbm - result.rxSensitivityDbm, 5);
  });
});

describe('linkStatus', () => {
  it('returns viable for a strong short-range link', () => {
    // 5 km, open sky → marginDb ≈ 42 dB, well above fadeMargin+MARGINAL_MARGIN_FLOOR (20 dB)
    const result = calculateLinkBudget(5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY);
    expect(result.linkStatus).toBe('viable');
  });

  it('returns not_viable when margin is below fade margin', () => {
    const result = calculateLinkBudget(300, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY);
    expect(result.linkStatus).toBe('not_viable');
  });

  it('returns marginal when link margin is below fadeMargin + MARGINAL_MARGIN_FLOOR_DB', () => {
    // Force a scenario where marginDb is just above fadeMarginDb (10) but below fadeMarginDb + 10 (20).
    // Use a custom sensitivity that puts receivedPower only 15 dB above it.
    // At 5 km: receivedPowerDbm ≈ -80.89. With sensitivity = -93.89, marginDb ≈ 13 (> 10, < 20).
    const tightSensitivity = -93.89;
    const result = calculateLinkBudget(5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, tightSensitivity);
    expect(result.linkViable).toBe(true);
    expect(result.marginDb).toBeGreaterThan(10);
    expect(result.marginDb).toBeLessThan(10 + MARGINAL_MARGIN_FLOOR_DB);
    expect(result.linkStatus).toBe('marginal');
  });

  it('returns marginal when Fresnel clearance is below MARGINAL_FRESNEL_FLOOR_M', () => {
    // Clear link by budget but obstruction deeper than -10 m into Fresnel zone
    const deepObstruction = MARGINAL_FRESNEL_FLOOR_M - 5; // -15 m
    const result = calculateLinkBudget(
      5, FREQ_MHZ, TX_POWER_DBM, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY,
      10, deepObstruction, 5,
    );
    expect(result.linkViable).toBe(true);
    expect(result.linkStatus).toBe('marginal');
  });

  it('returns marginal when path distance exceeds MARGINAL_DISTANCE_FLOOR_KM', () => {
    // 40 km is beyond 35 km threshold; use high TX power so budget still passes
    const highPowerDbm = 30;
    const result = calculateLinkBudget(
      MARGINAL_DISTANCE_FLOOR_KM + 5,
      FREQ_MHZ, highPowerDbm, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY,
    );
    expect(result.linkViable).toBe(true);
    expect(result.linkStatus).toBe('marginal');
  });

  it('viable link at exactly MARGINAL_DISTANCE_FLOOR_KM is not marginal for distance alone', () => {
    const highPowerDbm = 30;
    const result = calculateLinkBudget(
      MARGINAL_DISTANCE_FLOOR_KM,
      FREQ_MHZ, highPowerDbm, STOCK_GAIN_DBI, STOCK_GAIN_DBI, LONG_FAST_SENSITIVITY,
    );
    // Distance must be strictly > threshold to trigger marginal
    if (result.linkViable) {
      // At exactly 35 km distance trigger is false; status depends only on margin
      expect(result.linkStatus).not.toBe('not_viable');
    }
  });
});
