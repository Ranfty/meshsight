/**
 * Line-of-sight calculation engine for MeshSight.
 *
 * Given an elevation profile between TX and RX, determines whether the radio
 * path is clear by checking Fresnel zone clearance at every profile point,
 * with earth curvature correction (k = 4/3).
 *
 * No DOM or React imports — safe for use in Web Workers.
 */

const EARTH_RADIUS_M = 6_371_000;
const K_FACTOR = 4 / 3;
const EFFECTIVE_EARTH_RADIUS_M = EARTH_RADIUS_M * K_FACTOR; // ≈ 8,494,667 m
const SPEED_OF_LIGHT_MS = 299_792_458;
const FRESNEL_CLEARANCE_RATIO = 0.6;

export interface LOSResult {
  /** 60%+ of first Fresnel zone clear at ALL profile points? */
  isLos: boolean;
  /** Minimum clearance in metres (negative = terrain penetrates LOS line) */
  clearanceMinM: number;
  /** Distance from TX to the point of minimum clearance */
  obstructionDistanceM: number;
  /** Clearance at each intermediate profile sample (metres) */
  fresnelClearances: number[];
  /** First Fresnel zone radius at each intermediate sample (metres) */
  fresnelRadii: number[];
}

/**
 * Check line-of-sight between TX and RX using an elevation profile.
 *
 * @param profile - Array of { distanceM, elevationM } points ordered from TX
 *   to RX. The first point is at the TX location, the last at RX.
 * @param txHeightM - TX antenna height above ground level (metres)
 * @param rxHeightM - RX antenna height above ground level (metres)
 * @param frequencyMhz - Operating frequency (MHz)
 * @returns LOSResult with clearance analysis
 */
export function checkLOS(
  profile: { distanceM: number; elevationM: number }[],
  txHeightM: number,
  rxHeightM: number,
  frequencyMhz: number,
): LOSResult {
  // Edge case: empty or single-point profile — trivially clear
  if (profile.length < 2) {
    return {
      isLos: true,
      clearanceMinM: Infinity,
      obstructionDistanceM: 0,
      fresnelClearances: [],
      fresnelRadii: [],
    };
  }

  const totalDistanceM = profile[profile.length - 1].distanceM;

  // Edge case: zero total distance
  if (totalDistanceM <= 0) {
    return {
      isLos: true,
      clearanceMinM: Infinity,
      obstructionDistanceM: 0,
      fresnelClearances: [],
      fresnelRadii: [],
    };
  }

  // Wavelength in metres
  const frequencyHz = frequencyMhz * 1_000_000;
  const wavelengthM = SPEED_OF_LIGHT_MS / frequencyHz;

  // Antenna tip elevations ASL
  const txTipM = profile[0].elevationM + txHeightM;
  const rxTipM = profile[profile.length - 1].elevationM + rxHeightM;

  // Intermediate points (exclude first and last — those are the antennas)
  const fresnelClearances: number[] = [];
  const fresnelRadii: number[] = [];
  let clearanceMinM = Infinity;
  let obstructionDistanceM = 0;

  for (let i = 1; i < profile.length - 1; i++) {
    const point = profile[i];
    const distanceFromTxM = point.distanceM;
    const distanceFromRxM = totalDistanceM - distanceFromTxM;

    // Skip points with void/NaN elevation
    if (!isFinite(point.elevationM)) {
      fresnelClearances.push(NaN);
      fresnelRadii.push(NaN);
      continue;
    }

    // Straight-line LOS height at this point (linear interpolation between tips)
    const fractionAlongPath = distanceFromTxM / totalDistanceM;
    const losHeightM = txTipM + fractionAlongPath * (rxTipM - txTipM);

    // Earth curvature correction: terrain effectively rises by this amount
    // relative to the straight-line path
    const curvatureCorrectionM =
      (distanceFromTxM * distanceFromRxM) / (2 * EFFECTIVE_EARTH_RADIUS_M);

    // First Fresnel zone radius at this point
    const fresnelRadiusM = Math.sqrt(
      (wavelengthM * distanceFromTxM * distanceFromRxM) / totalDistanceM,
    );

    // Clearance = LOS height minus (terrain + curvature correction)
    const clearanceM =
      losHeightM - (point.elevationM + curvatureCorrectionM);

    fresnelClearances.push(clearanceM);
    fresnelRadii.push(fresnelRadiusM);

    if (clearanceM < clearanceMinM) {
      clearanceMinM = clearanceM;
      obstructionDistanceM = distanceFromTxM;
    }
  }

  // LOS is clear only if clearance >= 60% of F1 at ALL intermediate points
  let isLos = true;
  for (let i = 0; i < fresnelClearances.length; i++) {
    const clearance = fresnelClearances[i];
    const radius = fresnelRadii[i];
    if (!isFinite(clearance) || !isFinite(radius)) continue; // skip void
    if (clearance < FRESNEL_CLEARANCE_RATIO * radius) {
      isLos = false;
      break;
    }
  }

  return {
    isLos,
    clearanceMinM,
    obstructionDistanceM,
    fresnelClearances,
    fresnelRadii,
  };
}
