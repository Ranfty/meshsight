import { describe, it, expect } from 'vitest';
import { calculateLinkBudget } from './linkbudget';

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
