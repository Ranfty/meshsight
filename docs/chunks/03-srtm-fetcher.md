# Chunk 03 — SRTM Tile Fetcher + Parser

> **Status:** Complete
> **Model:** Sonnet · **Effort:** Medium (high if CORS issues)
> **Depends on:** Chunk 01
> **Estimated time:** ~3 hours

## Objective

Given a lat/lng, fetch the correct Terrarium elevation tile, decode it, cache it in IndexedDB, and expose a function `getElevation(lat, lng) → number` with bilinear interpolation.

## Deliverables

- [ ] `src/engine/srtm.ts` — ElevationProvider class
- [ ] `src/engine/geo.ts` — haversine distance, bearing, destination point, tile coordinate conversion
- [ ] Terrarium PNG tiles fetched from AWS S3 at zoom level 10
- [ ] RGB → elevation decoding: `height = (R * 256 + G + B / 256) - 32768`
- [ ] Bilinear interpolation between pixel centres
- [ ] Tile caching in IndexedDB via idb-keyval
- [ ] `prefetchArea(bounds)` to pre-cache tiles for a viewport
- [ ] `getProfile(from, to, samples)` for elevation profile along a line
- [ ] Works inside a Web Worker (uses OffscreenCanvas + createImageBitmap, not Image/HTMLCanvas)
- [ ] Vitest tests with known elevation reference points
- [ ] SRTM void handling (-32768 values → interpolate or return NaN)

## Specifications

**Terrarium tile URL:**

```
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
```

**Tile coordinate conversion (lat/lng → z/x/y):**

```typescript
function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom),
  );
  return { x, y };
}
```

**At zoom 10:** each tile is 256×256 pixels, covering approximately 0.35° × 0.35°. Each pixel ≈ 90–150m depending on latitude.

**PNG decoding in Worker:** must use `createImageBitmap()` + `OffscreenCanvas` as described in docs/WORKER_PATTERNS.md. `Image()` and `HTMLCanvasElement` are not available in Workers.

**Bilinear interpolation:** a point between four grid cells should return a weighted average of the four surrounding elevations, not just nearest-neighbour.

**IndexedDB caching:** use idb-keyval with key format `terrarium-{z}-{x}-{y}`. Store the decoded Float32Array (not the raw PNG). This avoids re-decoding on cache hits.

**Error handling:**

- Network failure → throw with descriptive message
- Tile not available (404) → return NaN for that area (ocean, polar regions)
- SRTM void values → if decoded elevation is < -500 (clearly invalid), treat as void

## Module API

```typescript
// src/engine/srtm.ts
class ElevationProvider {
  async prefetchArea(bounds: LatLngBounds): Promise<void>;
  async getElevation(lat: number, lng: number): Promise<number>;
  async getProfile(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    samples: number,
  ): Promise<
    { distanceM: number; elevationM: number; lat: number; lng: number }[]
  >;
  async isCached(bounds: LatLngBounds): Promise<boolean>;
}

// src/engine/geo.ts
function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number;
function initialBearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number;
function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): { lat: number; lng: number };
function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number };
function tileToLatLng(
  x: number,
  y: number,
  zoom: number,
): { lat: number; lng: number };
```

## Prompt

```
Implement the elevation data layer for meshsight. Read CLAUDE.md for architecture
rules (engine/ must have zero React imports, use IndexedDB not localStorage).
Read docs/WORKER_PATTERNS.md for the OffscreenCanvas PNG decoding pattern.

Create src/engine/geo.ts with:
- haversineDistanceM, initialBearingDeg, destinationPoint
- latLngToTile, tileToLatLng (for Terrarium tile coordinates at zoom 10)
- All distances in metres, bearings in degrees, coordinates in decimal degrees

Create src/engine/srtm.ts with an ElevationProvider class that:
1. Fetches Terrarium PNG tiles from AWS S3 at zoom 10
2. Decodes elevation from RGB: height = (R * 256 + G + B / 256) - 32768
3. Uses createImageBitmap() + OffscreenCanvas for PNG decoding (Worker-safe)
4. Caches decoded Float32Array in IndexedDB via idb-keyval, keyed by z-x-y
5. Exposes getElevation(lat, lng) with bilinear interpolation
6. Exposes getProfile(from, to, samples) returning {distanceM, elevationM, lat, lng}[]
7. Exposes prefetchArea(bounds) to pre-cache tiles for a map viewport
8. Handles voids (elevation < -500) and fetch errors gracefully

Write Vitest tests for geo.ts:
- Haversine: London to Paris ≈ 343 km
- Bearing: London to Paris ≈ 156°

Write Vitest tests for srtm.ts:
- Ben Nevis summit (56.7969, -5.0036) → ~1345m ±20m
- Second fetch of same tile should use cache (mock fetch to verify)
- Profile between two points returns correct number of samples
```

## Acceptance criteria

1. `getElevation(56.7969, -5.0036)` returns ~1345 ±20
2. Haversine London→Paris returns ~343000m ±1000m
3. Tile is fetched only once; second call hits IndexedDB cache
4. `getProfile` returns the requested number of samples with monotonically increasing distances
5. All functions work when called from a Web Worker context (no DOM dependencies)
6. `npx vitest run` passes all tests
