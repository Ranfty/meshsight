/// <reference lib="webworker" />

/**
 * Coverage calculation Web Worker for MeshSight.
 *
 * Handles radial-sweep coverage prediction and point-to-point elevation
 * profile / link budget analysis. All heavy computation runs here to keep
 * the main thread responsive.
 *
 * No DOM or React imports.
 */

import type {
  WorkerRequest,
  WorkerResponse,
  ElevationProfile,
} from '../types';
import { ElevationProvider } from './srtm';
import { checkLOS, type LOSResult } from './los';
import { calculateLinkBudget } from './linkbudget';
import { destinationPoint, haversineDistanceM } from './geo';

// ── Module-level state ─────────────────────────────────────────
const elevationProvider = new ElevationProvider();
const cancelledRequests = new Set<string>();

/** Approximate ground resolution at zoom 10 in metres. */
const RESOLUTION_M = 90;

/** Default receiver antenna height for coverage sweep (metres AGL). */
const RX_HEIGHT_M = 1.5;

/** Default TX power when not provided (dBm). */
const DEFAULT_TX_POWER_DBM = 20;

/** Default antenna gain when not provided (dBi — stock dipole). */
const DEFAULT_ANTENNA_GAIN_DBI = 2.15;

// ── Type-safe postMessage wrapper ──────────────────────────────
function respond(message: WorkerResponse, transfer?: Transferable[]) {
  if (transfer) {
    self.postMessage(message, transfer);
  } else {
    self.postMessage(message);
  }
}

// ── Cancellation helpers ───────────────────────────────────────
function isCancelled(id: string): boolean {
  if (cancelledRequests.has(id)) {
    cancelledRequests.delete(id);
    return true;
  }
  return false;
}

// ── Helpers ────────────────────────────────────────────────────

/** Find the index of the minimum clearance in a LOSResult. Returns -1 if empty. */
function findWorstFresnelIdx(losResult: LOSResult): number {
  let worstIdx = -1;
  let worstVal = Infinity;
  for (let i = 0; i < losResult.fresnelClearances.length; i++) {
    const c = losResult.fresnelClearances[i];
    if (isFinite(c) && c < worstVal) {
      worstVal = c;
      worstIdx = i;
    }
  }
  return worstIdx;
}

// ── Message handler ────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    switch (request.type) {
      case 'CALCULATE_COVERAGE':
        await handleCoverage(request);
        break;

      case 'CALCULATE_PROFILE':
        await handleProfile(request);
        break;

      case 'CANCEL':
        cancelledRequests.add(request.id);
        break;
    }
  } catch (error) {
    respond({
      type: 'ERROR',
      id: request.id,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ── Coverage handler (radial sweep) ────────────────────────────
async function handleCoverage(
  request: Extract<WorkerRequest, { type: 'CALCULATE_COVERAGE' }>,
) {
  const { id, node, loraConfig, radiusKm, azimuthSteps } = request;
  const radiusM = radiusKm * 1000;

  // 1. Compute geographic bounds and grid dimensions
  const degreesPerMetre = 1 / 111_320; // approximate at equator, close enough for bounds
  const latSpan = radiusM * degreesPerMetre;
  const lngSpan = radiusM / (111_320 * Math.cos((node.lat * Math.PI) / 180));

  const bounds = {
    north: node.lat + latSpan,
    south: node.lat - latSpan,
    east: node.lng + lngSpan,
    west: node.lng - lngSpan,
  };

  // 2. Prefetch all elevation tiles for the coverage area
  await elevationProvider.prefetchArea(bounds);

  // 3. Set up output grid
  const latExtentM = haversineDistanceM(
    bounds.south,
    node.lng,
    bounds.north,
    node.lng,
  );
  const lngExtentM = haversineDistanceM(
    node.lat,
    bounds.west,
    node.lat,
    bounds.east,
  );

  const rows = Math.ceil(latExtentM / RESOLUTION_M);
  const cols = Math.ceil(lngExtentM / RESOLUTION_M);
  const grid = new Float32Array(rows * cols);
  grid.fill(NaN); // NaN = no data

  // Precompute per-cell lat/lng step sizes
  const cellLatStep = (bounds.north - bounds.south) / rows;
  const cellLngStep = (bounds.east - bounds.west) / cols;

  // 4. Get TX ground elevation once
  const txGroundElevM = await elevationProvider.getElevation(
    node.lat,
    node.lng,
  );
  if (!isFinite(txGroundElevM)) {
    respond({
      type: 'ERROR',
      id,
      message: 'Cannot determine elevation at node location (ocean or void)',
    });
    return;
  }

  // Steps along each radial
  const maxSteps = Math.ceil(radiusM / RESOLUTION_M);

  // Progress reporting interval: every 10%
  const progressInterval = Math.max(1, Math.ceil(azimuthSteps / 10));

  // 5. Radial sweep
  for (let az = 0; az < azimuthSteps; az++) {
    if (isCancelled(id)) return;

    const bearingDeg = (az / azimuthSteps) * 360;

    // Build elevation profile incrementally along this radial
    const profile: { distanceM: number; elevationM: number }[] = [
      { distanceM: 0, elevationM: txGroundElevM },
    ];

    for (let step = 1; step <= maxSteps; step++) {
      const distanceM = step * RESOLUTION_M;
      const point = destinationPoint(
        node.lat,
        node.lng,
        bearingDeg,
        distanceM,
      );

      const elevationM = await elevationProvider.getElevation(
        point.lat,
        point.lng,
      );

      // Use 0 for void/ocean pixels so the radial continues
      const safeElevM = isFinite(elevationM) ? elevationM : 0;

      profile.push({ distanceM, elevationM: safeElevM });

      // Run LOS check against the accumulated profile
      const losResult = checkLOS(
        profile,
        node.antennaHeightM,
        RX_HEIGHT_M,
        loraConfig.frequencyMhz,
      );

      // Calculate link budget
      const distanceKm = distanceM / 1000;
      const worstIdx = findWorstFresnelIdx(losResult);
      const linkResult = calculateLinkBudget(
        distanceKm,
        loraConfig.frequencyMhz,
        node.txPowerDbm,
        node.antennaGainDbi,
        node.antennaGainDbi, // symmetric link assumption for coverage prediction
        loraConfig.rxSensitivityDbm,
        10, // fade margin dB
        worstIdx >= 0 ? losResult.fresnelClearances[worstIdx] : undefined,
        worstIdx >= 0 ? losResult.fresnelRadii[worstIdx] : undefined,
      );

      // Map this point to a grid cell
      const gridRow = Math.floor(
        (bounds.north - point.lat) / cellLatStep,
      );
      const gridCol = Math.floor(
        (point.lng - bounds.west) / cellLngStep,
      );

      if (
        gridRow >= 0 &&
        gridRow < rows &&
        gridCol >= 0 &&
        gridCol < cols
      ) {
        grid[gridRow * cols + gridCol] = linkResult.receivedPowerDbm;
      }

      // Stop this radial if the link is no longer viable
      if (!linkResult.linkViable) break;
    }

    // Report progress
    if (az % progressInterval === 0) {
      respond({
        type: 'COVERAGE_PROGRESS',
        id,
        percent: Math.round((az / azimuthSteps) * 100),
      });
    }
  }

  // 6. Final progress
  respond({ type: 'COVERAGE_PROGRESS', id, percent: 100 });

  // 7. Transfer the grid buffer to the main thread (zero-copy)
  respond(
    {
      type: 'COVERAGE_RESULT',
      id,
      result: {
        nodeId: node.id,
        grid,
        bounds,
        resolution: RESOLUTION_M,
        cols,
        rows,
      },
    },
    [grid.buffer],
  );
}

// ── Profile handler ────────────────────────────────────────────
async function handleProfile(
  request: Extract<WorkerRequest, { type: 'CALCULATE_PROFILE' }>,
) {
  const { id, from, to, txHeightM, rxHeightM, loraConfig } = request;

  const totalDistanceM = haversineDistanceM(
    from.lat,
    from.lng,
    to.lat,
    to.lng,
  );

  // Sample every ~90m, with a minimum of 2 and maximum of 500 samples
  const sampleCount = Math.max(
    2,
    Math.min(500, Math.ceil(totalDistanceM / RESOLUTION_M) + 1),
  );

  const profilePoints = await elevationProvider.getProfile(
    from,
    to,
    sampleCount,
  );

  // Run LOS analysis
  const losResult = checkLOS(
    profilePoints,
    txHeightM,
    rxHeightM,
    loraConfig.frequencyMhz,
  );

  // Calculate link budget (protocol doesn't include TX power / antenna gains,
  // so we use LoRa defaults: 20 dBm TX, 2.15 dBi stock dipole both ends)
  const distanceKm = totalDistanceM / 1000;
  const worstIdx = findWorstFresnelIdx(losResult);
  const linkResult = calculateLinkBudget(
    distanceKm,
    loraConfig.frequencyMhz,
    DEFAULT_TX_POWER_DBM,
    DEFAULT_ANTENNA_GAIN_DBI,
    DEFAULT_ANTENNA_GAIN_DBI,
    loraConfig.rxSensitivityDbm,
    10,
    worstIdx >= 0 ? losResult.fresnelClearances[worstIdx] : undefined,
    worstIdx >= 0 ? losResult.fresnelRadii[worstIdx] : undefined,
  );

  const result: ElevationProfile = {
    points: profilePoints,
    fresnelClearance: losResult.fresnelClearances,
    isLos: losResult.isLos,
    linkBudgetDb: linkResult.marginDb,
    maxRange: linkResult.linkViable,
  };

  respond({ type: 'PROFILE_RESULT', id, result });
}

export {};
