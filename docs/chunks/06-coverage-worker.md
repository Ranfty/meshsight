# Chunk 06 — Coverage Calculation Web Worker

> **Status:** Complete
> **Model:** Opus · **Effort:** High
> **Depends on:** Chunks 03, 04, 05
> **Estimated time:** ~4 hours

## Objective

A Web Worker that, given a node position and LoRa config, calculates a coverage grid by running the radial sweep algorithm (LOS + link budget for each direction). Returns a Float32Array of signal strengths.

## Why Opus + High Effort

This is the most architecturally complex chunk. It integrates three engine modules (srtm, los, linkbudget) inside a Web Worker with cancellation, progress reporting, Transferable objects, and tile prefetching. Many interacting concerns.

## Deliverables

- [ ] `src/engine/coverage.worker.ts` — Web Worker entry point
- [ ] Radial sweep algorithm: 360 azimuths, stepping outward in ~90m increments
- [ ] Tile prefetching before sweep begins
- [ ] Progress reporting every 10% of completed radials
- [ ] Cancellation support via CANCEL messages
- [ ] Float32Array result with Transferable transfer
- [ ] CALCULATE_PROFILE handler for point-to-point analysis
- [ ] `src/hooks/useCoverageWorker.ts` — React hook wrapping the Worker
- [ ] Error handling for tile fetch failures, calculation errors
- [ ] Worker-safe PNG decoding (OffscreenCanvas + createImageBitmap)

## Algorithm detail

```
For each azimuth (0° to 359°):
  profile = []
  for step = 1 to maxSteps:
    distance = step × resolution (~90m)
    point = destinationPoint(node.lat, node.lng, azimuth, distance)
    elevation = getElevation(point.lat, point.lng)
    profile.push({ distanceM: distance, elevationM: elevation })

    losResult = checkLOS(profile, node.antennaHeightM, 1.5, config.frequencyMhz)
    // RX height 1.5m = person holding a handheld

    if losResult.isLos:
      linkResult = calculateLinkBudget(distance/1000, config.frequencyMhz, ...)
      grid[row][col] = linkResult.receivedPowerDbm
    else:
      // Partially obstructed — apply diffraction loss
      linkResult = calculateLinkBudget(distance/1000, ..., fresnelClearance, fresnelRadius)
      if linkResult.linkViable:
        grid[row][col] = linkResult.receivedPowerDbm
      else:
        grid[row][col] = -Infinity  // no coverage
        break  // stop this radial — everything beyond is shadowed
```

**Grid mapping:** The output grid is a rectangular array covering a bounding box around the node ± radiusKm. Each grid cell corresponds to a geographic point. The radial sweep writes to whichever cell the current azimuth/distance falls in.

**Receiver height assumption:** Use 1.5m AGL as the default receiver height (person holding a device). This is not configurable in Phase 1.

## Prompt

```
Implement the coverage calculation Web Worker. Read CLAUDE.md, docs/WORKER_PATTERNS.md
(for Worker setup, typed messages, Transferable, OffscreenCanvas), and
docs/ARCHITECTURE.md (for the WorkerRequest/WorkerResponse protocol and
radial sweep algorithm).

Create src/engine/coverage.worker.ts:
1. Start with /// <reference lib="webworker" /> and end with export {}
2. Use self.onmessage with MessageEvent<WorkerRequest>
3. Create a module-level ElevationProvider instance
4. Handle CALCULATE_COVERAGE:
   a. Calculate geographic bounds: node position ± radiusKm
   b. Prefetch all elevation tiles needed for those bounds
   c. Create output Float32Array grid (rows × cols at ~90m resolution)
   d. For each of 360 azimuths:
      - Walk outward in ~90m steps using destinationPoint
      - Build elevation profile incrementally
      - At each step, run checkLOS against the accumulated profile
      - Calculate link budget (use 1.5m as receiver height)
      - Write received power to the grid cell
      - Stop the radial if link is no longer viable
      - Report progress every 36 azimuths (10%)
      - Check cancellation flag
   e. Transfer the Float32Array buffer to main thread
5. Handle CALCULATE_PROFILE: get elevation profile, run LOS + link budget
6. Handle CANCEL: track cancelled request IDs in a Set

Create src/hooks/useCoverageWorker.ts:
1. Creates Worker with new URL() pattern from docs/WORKER_PATTERNS.md
2. Terminates on unmount
3. Exposes calculateCoverage(node, config, radiusKm) → returns request ID
4. Exposes calculateProfile(from, to, txH, rxH, config) → returns request ID
5. Exposes cancel(id)
6. Callbacks: onProgress, onCoverageResult, onProfileResult, onError
7. Use useRef for Worker, useRef for callbacks (avoid recreating Worker)
```

## Acceptance criteria

1. Worker calculates coverage and returns a Float32Array with > 0 non-Infinity cells
2. Progress callback fires at ~10% intervals
3. Cancel prevents further processing of a cancelled request
4. Profile calculation returns valid elevation data with LOS result
5. Worker doesn't block the main thread (UI remains responsive during calculation)
6. No DOM APIs used (no Image(), no HTMLCanvasElement)
7. Worker file compiles with `/// <reference lib="webworker" />` — no type errors
