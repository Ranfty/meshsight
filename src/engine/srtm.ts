/**
 * ElevationProvider — fetches, decodes, caches, and interpolates Terrarium PNG
 * elevation tiles from AWS S3.
 *
 * Worker-safe: uses createImageBitmap + OffscreenCanvas (no Image/HTMLCanvas).
 * Tile data is cached in IndexedDB via idb-keyval so tiles survive page reloads.
 *
 * No DOM or React imports.
 */

import { get, set } from 'idb-keyval';
import {
  haversineDistanceM,
  destinationPoint,
  initialBearingDeg,
  latLngToTile,
  tileToLatLng,
} from './geo';

const TERRARIUM_ZOOM = 10;
const TILE_SIZE = 256;
const TERRARIUM_BASE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';

const VOID_THRESHOLD = -500;

interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** In-memory cache to avoid repeated IndexedDB reads within the same session. */
const memoryCache = new Map<string, Float32Array>();

/** Exposed for testing only — clears the in-memory tile cache. */
export function _clearMemoryCache(): void {
  memoryCache.clear();
}

function tileKey(z: number, x: number, y: number): string {
  return `terrarium-${z}-${x}-${y}`;
}

/**
 * Decode a Terrarium PNG ArrayBuffer into a Float32Array of elevations.
 * Uses OffscreenCanvas + createImageBitmap — works in Web Workers.
 */
async function decodeTerrariumPng(buffer: ArrayBuffer): Promise<Float32Array> {
  const blob = new Blob([buffer], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get OffscreenCanvas 2D context');

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const elevations = new Float32Array(canvas.width * canvas.height);

  for (let i = 0; i < elevations.length; i++) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    elevations[i] = r * 256 + g + b / 256 - 32768;
  }

  return elevations;
}

export class ElevationProvider {
  /**
   * Fetch a tile and return its decoded elevation array.
   * Checks memory cache → IndexedDB → network, in that order.
   * Returns null for 404 (ocean / polar region with no data).
   */
  private async getTile(
    z: number,
    x: number,
    y: number,
  ): Promise<Float32Array | null> {
    const key = tileKey(z, x, y);

    const mem = memoryCache.get(key);
    if (mem) return mem;

    const cached = await get<Float32Array>(key);
    if (cached) {
      memoryCache.set(key, cached);
      return cached;
    }

    const url = `${TERRARIUM_BASE_URL}/${z}/${x}/${y}.png`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new Error(
        `Network error fetching elevation tile ${key}: ${String(err)}`,
      );
    }

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(
        `Failed to fetch elevation tile ${key}: HTTP ${response.status}`,
      );
    }

    const buffer = await response.arrayBuffer();
    const elevations = await decodeTerrariumPng(buffer);

    // Store decoded Float32Array — avoids re-decoding on cache hits
    await set(key, elevations);
    memoryCache.set(key, elevations);

    return elevations;
  }

  /**
   * Return the elevation in metres at the given lat/lng using bilinear
   * interpolation between the four surrounding pixel centres.
   * Returns NaN for ocean / void areas.
   */
  async getElevation(lat: number, lng: number): Promise<number> {
    const { x: tileX, y: tileY } = latLngToTile(lat, lng, TERRARIUM_ZOOM);

    const elevations = await this.getTile(TERRARIUM_ZOOM, tileX, tileY);
    if (!elevations) return NaN;

    const tileNW = tileToLatLng(tileX, tileY, TERRARIUM_ZOOM);
    const tileSE = tileToLatLng(tileX + 1, tileY + 1, TERRARIUM_ZOOM);

    const tileLatSpan = tileNW.lat - tileSE.lat;
    const tileLngSpan = tileSE.lng - tileNW.lng;

    const px = ((lng - tileNW.lng) / tileLngSpan) * TILE_SIZE;
    const py = ((tileNW.lat - lat) / tileLatSpan) * TILE_SIZE;

    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, v));

    const x0 = clamp(Math.floor(px), 0, TILE_SIZE - 1);
    const y0 = clamp(Math.floor(py), 0, TILE_SIZE - 1);
    const x1 = clamp(x0 + 1, 0, TILE_SIZE - 1);
    const y1 = clamp(y0 + 1, 0, TILE_SIZE - 1);

    const fx = px - x0;
    const fy = py - y0;

    const asValid = (e: number) => (e < VOID_THRESHOLD ? NaN : e);
    const e00 = asValid(elevations[y0 * TILE_SIZE + x0]);
    const e10 = asValid(elevations[y0 * TILE_SIZE + x1]);
    const e01 = asValid(elevations[y1 * TILE_SIZE + x0]);
    const e11 = asValid(elevations[y1 * TILE_SIZE + x1]);

    if (isNaN(e00) || isNaN(e10) || isNaN(e01) || isNaN(e11)) {
      // Fall back to the first non-void corner
      return [e00, e10, e01, e11].find((e) => !isNaN(e)) ?? NaN;
    }

    return (
      e00 * (1 - fx) * (1 - fy) +
      e10 * fx * (1 - fy) +
      e01 * (1 - fx) * fy +
      e11 * fx * fy
    );
  }

  /**
   * Sample an elevation profile along the great-circle path from `from` to `to`.
   * Returns `samples` evenly-spaced points (including both endpoints).
   */
  async getProfile(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    samples: number,
  ): Promise<
    { distanceM: number; elevationM: number; lat: number; lng: number }[]
  > {
    if (samples < 2) {
      throw new Error('getProfile requires at least 2 samples');
    }

    const totalDistanceM = haversineDistanceM(
      from.lat,
      from.lng,
      to.lat,
      to.lng,
    );
    const bearingDeg = initialBearingDeg(from.lat, from.lng, to.lat, to.lng);

    // Pre-fetch tiles covering the route bounding box
    const bounds: LatLngBounds = {
      north: Math.max(from.lat, to.lat),
      south: Math.min(from.lat, to.lat),
      east: Math.max(from.lng, to.lng),
      west: Math.min(from.lng, to.lng),
    };
    await this.prefetchArea(bounds);

    const profile: {
      distanceM: number;
      elevationM: number;
      lat: number;
      lng: number;
    }[] = [];

    for (let i = 0; i < samples; i++) {
      let point: { lat: number; lng: number };
      let distanceM: number;

      if (i === 0) {
        point = from;
        distanceM = 0;
      } else if (i === samples - 1) {
        point = to;
        distanceM = totalDistanceM;
      } else {
        distanceM = (totalDistanceM * i) / (samples - 1);
        point = destinationPoint(from.lat, from.lng, bearingDeg, distanceM);
      }

      const elevationM = await this.getElevation(point.lat, point.lng);
      profile.push({ distanceM, elevationM, lat: point.lat, lng: point.lng });
    }

    return profile;
  }

  /**
   * Pre-fetch and cache all tiles that cover the given lat/lng bounds.
   * Failures are silently swallowed so a single bad tile doesn't block the rest.
   */
  async prefetchArea(bounds: LatLngBounds): Promise<void> {
    const { x: xMin, y: yMin } = latLngToTile(
      bounds.north,
      bounds.west,
      TERRARIUM_ZOOM,
    );
    const { x: xMax, y: yMax } = latLngToTile(
      bounds.south,
      bounds.east,
      TERRARIUM_ZOOM,
    );

    const fetches: Promise<Float32Array | null>[] = [];
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        fetches.push(this.getTile(TERRARIUM_ZOOM, x, y));
      }
    }

    await Promise.allSettled(fetches);
  }

  /**
   * Returns true if every tile covering `bounds` is already in the IndexedDB cache.
   */
  async isCached(bounds: LatLngBounds): Promise<boolean> {
    const { x: xMin, y: yMin } = latLngToTile(
      bounds.north,
      bounds.west,
      TERRARIUM_ZOOM,
    );
    const { x: xMax, y: yMax } = latLngToTile(
      bounds.south,
      bounds.east,
      TERRARIUM_ZOOM,
    );

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const key = tileKey(TERRARIUM_ZOOM, x, y);
        if (memoryCache.has(key)) continue;
        const cached = await get<Float32Array>(key);
        if (!cached) return false;
        memoryCache.set(key, cached);
      }
    }
    return true;
  }
}
