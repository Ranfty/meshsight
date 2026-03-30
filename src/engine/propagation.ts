/**
 * RF propagation models for MeshSight.
 *
 * Free-space path loss and knife-edge diffraction loss.
 * No DOM or React imports — safe for use in Web Workers.
 */

/**
 * Free-space path loss in dB.
 *
 * FSPL(dB) = 20×log10(d_km) + 20×log10(f_MHz) + 32.44
 *
 * @param distanceKm - Link distance in kilometres (must be > 0)
 * @param frequencyMhz - Operating frequency in MHz
 */
export function fsplDb(distanceKm: number, frequencyMhz: number): number {
  if (distanceKm <= 0 || frequencyMhz <= 0) return 0;
  return 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyMhz) + 32.44;
}

/**
 * Knife-edge diffraction loss using the Fresnel-Kirchhoff approximation.
 *
 * Sign convention (matches los.ts):
 *   fresnelClearanceM > 0  →  obstacle below LOS line (clear path)
 *   fresnelClearanceM < 0  →  obstacle above LOS line (obstructed)
 *
 * Internally this converts to the standard Fresnel-Kirchhoff v parameter
 * where v > 0 means obstructed, then applies the piecewise approximation.
 *
 * @param fresnelClearanceM - LOS clearance in metres at the most obstructed point
 * @param fresnelRadiusM - First Fresnel zone radius at that point (metres)
 * @returns Diffraction loss in dB (always ≥ 0)
 */
export function diffractionLossDb(fresnelClearanceM: number, fresnelRadiusM: number): number {
  if (fresnelRadiusM <= 0) return 0;

  // Standard Fresnel-Kirchhoff v: positive when obstructed, negative when clear.
  // Negate the clearance so that v > 0 = blocked (standard RF convention).
  const v = (-fresnelClearanceM / fresnelRadiusM) * Math.SQRT2;

  if (v <= -1) {
    // Deeply clear — negligible diffraction loss
    return 0;
  }
  if (v <= 2.4) {
    // Transition region — polynomial approximation (6 dB at grazing, v = 0)
    return Math.max(0, 6 + 9 * v + 1.5 * v * v);
  }
  // Deep diffraction shadow — logarithmic growth
  return 13 + 20 * Math.log10(v);
}
