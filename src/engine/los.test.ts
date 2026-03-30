import { describe, it, expect } from 'vitest';
import { checkLOS } from './los';

/** Helper: build a flat profile with uniform elevation and evenly spaced points. */
function flatProfile(
  numPoints: number,
  totalDistanceM: number,
  elevationM: number,
): { distanceM: number; elevationM: number }[] {
  return Array.from({ length: numPoints }, (_, i) => ({
    distanceM: (totalDistanceM * i) / (numPoints - 1),
    elevationM,
  }));
}

describe('checkLOS', () => {
  // ── Test 1: Flat terrain, clear LOS ──────────────────────────
  // At 868 MHz over 3km, F1 midpoint ≈ 16m, so 60% clearance needs ~10m.
  // Antennas must be tall enough for the LOS line to clear terrain + Fresnel.
  it('reports clear LOS over flat terrain with elevated antennas', () => {
    const profile = flatProfile(40, 3000, 100);
    const result = checkLOS(profile, 20, 15, 868);

    expect(result.isLos).toBe(true);
    expect(result.clearanceMinM).toBeGreaterThan(0);
    expect(result.fresnelClearances).toHaveLength(38); // 40 - 2 endpoints
    expect(result.fresnelRadii).toHaveLength(38);

    // All clearances should be positive
    for (const c of result.fresnelClearances) {
      expect(c).toBeGreaterThan(0);
    }
  });

  // ── Test 2: Hill obstruction ─────────────────────────────────
  it('reports blocked LOS when a hill obstructs the midpoint', () => {
    const profile = flatProfile(40, 3000, 100);
    // Place a 200m hill at the midpoint (index 20)
    profile[20] = { ...profile[20], elevationM: 200 };

    const result = checkLOS(profile, 10, 10, 868);

    expect(result.isLos).toBe(false);
    // The obstruction should be near the midpoint (~1500m)
    expect(result.obstructionDistanceM).toBeCloseTo(1500, -2); // within ~100m
    // Clearance at the hill should be negative (terrain above LOS line)
    expect(result.clearanceMinM).toBeLessThan(0);
  });

  // ── Test 3: Earth curvature blockage at long distance ────────
  it('reports blocked LOS over 50km flat terrain due to earth curvature', () => {
    const profile = flatProfile(600, 50_000, 0);
    const result = checkLOS(profile, 2, 2, 868);

    expect(result.isLos).toBe(false);

    // At midpoint (25km from each end), curvature correction should be:
    // d1 * d2 / (2 * Re * k) = 25000 * 25000 / (2 * 8494667) ≈ 36.8m
    // With only 2m antenna height, the LOS line at midpoint is at ~2m,
    // so clearance should be roughly 2m - 36.8m = -34.8m
    expect(result.clearanceMinM).toBeLessThan(-30);
  });

  // ── Test 4: Zero distance / single point ─────────────────────
  it('handles single-point profile without crashing', () => {
    const profile = [{ distanceM: 0, elevationM: 50 }];
    const result = checkLOS(profile, 5, 5, 868);

    expect(result.isLos).toBe(true);
    expect(result.fresnelClearances).toHaveLength(0);
    expect(result.fresnelRadii).toHaveLength(0);
  });

  // ── Test 5: Empty profile ────────────────────────────────────
  it('handles empty profile without crashing', () => {
    const result = checkLOS([], 5, 5, 868);

    expect(result.isLos).toBe(true);
    expect(result.fresnelClearances).toHaveLength(0);
  });

  // ── Test 6: Two-point profile (endpoints only) ───────────────
  it('handles two-point profile with no intermediate points', () => {
    const profile = [
      { distanceM: 0, elevationM: 100 },
      { distanceM: 1000, elevationM: 100 },
    ];
    const result = checkLOS(profile, 10, 10, 868);

    // No intermediate points to check — trivially clear
    expect(result.isLos).toBe(true);
    expect(result.fresnelClearances).toHaveLength(0);
  });

  // ── Test 7: NaN/void elevations are skipped ──────────────────
  it('skips NaN elevation points without blocking LOS', () => {
    const profile = flatProfile(20, 2000, 100);
    // Inject a NaN point in the middle
    profile[10] = { distanceM: profile[10].distanceM, elevationM: NaN };

    const result = checkLOS(profile, 10, 10, 868);

    expect(result.isLos).toBe(true);
    // NaN clearance should be present but not affect the result
    expect(isNaN(result.fresnelClearances[9])).toBe(true); // index 10 → array index 9
  });

  // ── Test 8: Fresnel zone radius calculation ──────────────────
  it('calculates correct Fresnel zone radius at midpoint', () => {
    const profile = flatProfile(101, 10_000, 0);
    const result = checkLOS(profile, 50, 50, 868);

    // At midpoint (5000m from each end):
    // λ = 299792458 / 868e6 ≈ 0.34538m
    // F1 = sqrt(λ * d1 * d2 / D) = sqrt(0.34538 * 5000 * 5000 / 10000)
    //    = sqrt(0.34538 * 2500) = sqrt(863.45) ≈ 29.38m
    const midpointIndex = 49; // index 50 in profile → index 49 in fresnelRadii
    expect(result.fresnelRadii[midpointIndex]).toBeCloseTo(29.38, 0);
  });

  // ── Test 9: Short path with tall antennas — clear ────────────
  it('reports clear LOS for short path even with near-grazing terrain', () => {
    const profile = flatProfile(20, 500, 50);
    // Small bump but tall antennas should clear it
    profile[10] = { ...profile[10], elevationM: 55 };

    const result = checkLOS(profile, 20, 20, 868);

    expect(result.isLos).toBe(true);
  });

  // ── Test 10: US 915 MHz frequency ────────────────────────────
  it('works with US 915 MHz frequency', () => {
    const profile = flatProfile(40, 3000, 100);
    const result = checkLOS(profile, 20, 15, 915);

    expect(result.isLos).toBe(true);
    // Slightly smaller Fresnel zone than 868 MHz (shorter wavelength)
    const result868 = checkLOS(profile, 20, 15, 868);
    // Compare midpoint radii
    const mid = Math.floor(result.fresnelRadii.length / 2);
    expect(result.fresnelRadii[mid]).toBeLessThan(result868.fresnelRadii[mid]);
  });

  // ── Test 11: Earth curvature math validation ─────────────────
  it('applies correct earth curvature correction magnitude', () => {
    // At 25km from both ends of a 50km path, curvature correction should be:
    // 25000 * 25000 / (2 * 8494667) ≈ 36.79m
    const profile = flatProfile(3, 50_000, 0);
    // profile[1] is at 25km (midpoint)
    const result = checkLOS(profile, 100, 100, 868);

    // LOS height at midpoint = 100 (both tips at 100m ASL, terrain at 0m + 100m antenna)
    // Clearance = 100 - (0 + 36.79) = 63.21m
    // With 100m antennas on flat terrain over 50km, should still be clear
    expect(result.clearanceMinM).toBeCloseTo(63.2, 0);
  });

  // ── Test 12: Asymmetric antenna heights ──────────────────────
  it('correctly handles asymmetric TX/RX antenna heights', () => {
    // 5km at 868 MHz: F1 midpoint ≈ 21m, need tall antennas for clearance
    const profile = flatProfile(40, 5000, 200);
    const result = checkLOS(profile, 40, 25, 868);

    expect(result.isLos).toBe(true);
    // Clearance should be lower near RX (lower antenna)
    const lastClearance =
      result.fresnelClearances[result.fresnelClearances.length - 1];
    const firstClearance = result.fresnelClearances[0];
    expect(lastClearance).toBeLessThan(firstClearance);
  });
});
