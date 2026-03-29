# Chunk 04 — Line-of-Sight Engine

> **Status:** Not started
> **Model:** Opus · **Effort:** High
> **Depends on:** Chunk 03
> **Estimated time:** ~3 hours

## Objective

Given two points with antenna heights, determine if there is line-of-sight between them, accounting for earth curvature and Fresnel zone clearance.

## Why Opus + High Effort

This chunk involves multi-step physics: earth curvature correction, Fresnel zone geometry, and their interaction. A sign error or unit mismatch here invalidates every coverage prediction downstream. After implementation, run the rf-checker agent to validate.

## Deliverables

- [ ] `src/engine/los.ts` — `checkLOS()` function
- [ ] Earth curvature correction using k=4/3 effective earth radius
- [ ] First Fresnel zone radius calculation
- [ ] LOS determined by 60% F1 clearance at all profile points
- [ ] Returns minimum clearance, obstruction location, per-point clearances
- [ ] Handles edge cases: zero distance, same elevation, very long paths
- [ ] Vitest tests with synthetic profiles

## Algorithm

The LOS check walks along the elevation profile between TX and RX, checking whether any terrain point intersects the radio path.

**Step 1: Establish the straight-line path.**
- TX antenna tip: `elevationTx + antennaHeightTx`
- RX antenna tip: `elevationRx + antennaHeightRx`
- At any fraction `t` along the path: `losHeight(t) = txTip + t * (rxTip - txTip)`

**Step 2: Apply earth curvature correction.**
- At distance `d` from TX, the earth curves away from the straight line
- Correction: `curveM = d² / (2 × EFFECTIVE_EARTH_RADIUS)`
- Where `EFFECTIVE_EARTH_RADIUS = EARTH_RADIUS × (4/3) = 8,494,667 m`
- This correction is SUBTRACTED from the LOS line height (or equivalently, ADDED to the terrain height)

**Step 3: Calculate Fresnel zone radius.**
- At distance `d` from TX (total path length `D`):
- `F1 = sqrt(λ × d × (D - d) / D)`
- Where `λ = c / frequency` (wavelength in metres)
- At 868 MHz: λ ≈ 0.3456 m
- The Fresnel zone is widest at the midpoint

**Step 4: Check clearance.**
- At each profile point, the clearance is:
- `clearance = (losHeight - curvatureCorrection) - terrainElevation`
- LOS is clear if `clearance ≥ 0.6 × F1` at ALL points

## Module API

```typescript
// src/engine/los.ts

interface LOSResult {
  isLos: boolean;                // 60%+ Fresnel zone clear at all points?
  clearanceMinM: number;         // minimum clearance in metres (negative = blocked)
  obstructionDistanceM: number;  // distance from TX to worst obstruction point
  fresnelClearances: number[];   // clearance at each profile sample (metres)
  fresnelRadii: number[];        // F1 radius at each point (metres)
}

function checkLOS(
  profile: { distanceM: number; elevationM: number }[],
  txHeightM: number,             // antenna height AGL at TX
  rxHeightM: number,             // antenna height AGL at RX
  frequencyMhz: number
): LOSResult
```

## Constants

```typescript
const EARTH_RADIUS_M = 6_371_000;
const K_FACTOR = 4 / 3;
const EFFECTIVE_EARTH_RADIUS_M = EARTH_RADIUS_M * K_FACTOR; // 8,494,667 m
const SPEED_OF_LIGHT_MS = 299_792_458;
```

## Edge cases to handle

- `profile.length < 2`: return isLos: true with no obstruction
- Total distance = 0: return isLos: true
- TX and RX at identical elevation and height: LOS line is horizontal, curvature still applies
- Profile with void/NaN elevations: skip those points in LOS check
- Very long paths (>50km): earth curvature alone may block even over flat terrain

## Prompt

```
Implement the line-of-sight calculation engine in src/engine/los.ts.
Read CLAUDE.md for the RF calculation reference (constants and formulae).

The checkLOS function takes an elevation profile, TX/RX antenna heights AGL,
and frequency in MHz. It must:

1. Calculate the straight-line path between TX antenna tip and RX antenna tip
2. Apply earth curvature correction using k=4/3 effective earth radius:
   correction = d² / (2 × Re × k) where Re = 6,371,000 m
3. Calculate first Fresnel zone radius at each point:
   F1 = sqrt(λ × d1 × d2 / D) where λ = c / f
4. Report isLos=true only if clearance ≥ 0.6 × F1 at ALL points
5. Return minimum clearance, obstruction distance, and per-point arrays

Handle edge cases: empty/short profiles, zero distance, void elevations,
very long paths where curvature alone blocks.

Write comprehensive Vitest tests:

Test 1 - Flat terrain clear:
  Profile: 40 points, all at 100m elevation, 0 to 3000m distance
  TX: 10m AGL, RX: 5m AGL, 868 MHz
  Expected: isLos = true, clearanceMinM > 0

Test 2 - Hill obstruction:
  Profile: 40 points at 100m, except point 20 (midpoint) at 200m
  TX: 10m AGL, RX: 10m AGL, 868 MHz, 3000m total
  Expected: isLos = false, obstructionDistanceM ≈ 1500m

Test 3 - Earth curvature blockage:
  Profile: 600 points, all at 0m elevation, 0 to 50000m distance
  TX: 2m AGL, RX: 2m AGL, 868 MHz
  Expected: isLos = false (earth curvature at 25km ≈ 37m correction)

Test 4 - Edge case: zero distance:
  Profile: 1 point
  Expected: isLos = true, no crash

After implementing, use the rf-checker agent to validate the maths.
```

## Acceptance criteria

1. Flat terrain test passes (LOS clear)
2. Hill obstruction test reports blocked with correct obstruction distance
3. Earth curvature test reports blocked at 50km even on flat terrain
4. Zero-distance edge case doesn't crash
5. rf-checker agent validates constants and formula implementation
6. `npx vitest run` passes all tests
