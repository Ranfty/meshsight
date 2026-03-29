# MeshSight Phase 1 — Architecture Specification

> **Status:** Not started
> **Last updated:** 2026-03-29

## What Phase 1 delivers

A pure client-side web application (no backend) that lets a Meshtastic operator drop node pins on a terrain map and instantly see predicted RF coverage heatmaps. The app fetches real SRTM elevation data, performs line-of-sight analysis in a Web Worker, and paints a coverage overlay showing where each node can and can't reach.

Ships as a static site — deployable to GitHub Pages, Netlify, or Cloudflare Pages. No server, no Docker, no database.

## Functional requirements

- **FR-1:** User can place nodes on an interactive map by clicking, with configurable antenna height (m AGL), transmit power (dBm), and device role label.
- **FR-2:** User can drag nodes to reposition them. Coverage recalculates on drop.
- **FR-3:** For each node, the app calculates and renders a coverage heatmap showing predicted signal strength at 868/915 MHz over the surrounding terrain using real elevation data.
- **FR-4:** User can click any two nodes to see the elevation profile between them, with Fresnel zone clearance visualised.
- **FR-5:** User can configure LoRa parameters: frequency band (EU 868 / US 915), modem preset (Long Fast, Long Moderate, etc.), and antenna gain.
- **FR-6:** Node plans are persisted to localStorage and can be exported/imported as JSON.
- **FR-7:** The app works offline after first load (PWA) with cached SRTM tiles.

## Non-functional requirements

- **NFR-1:** Coverage calculation for a single node must complete in under 5 seconds on a mid-range laptop for a 10km radius at 90m resolution.
- **NFR-2:** UI remains responsive during calculation (Web Worker, no main thread blocking).
- **NFR-3:** SRTM tiles are fetched on demand and cached in IndexedDB (not re-downloaded on every session).
- **NFR-4:** Mobile-usable — the map and controls must work on a phone screen.

## System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│                                                                 │
│  ┌──────────────┐   state    ┌──────────────┐                  │
│  │  React UI    │ ◄───────► │  Zustand     │                  │
│  │  + Leaflet   │           │  Store       │                  │
│  └──────┬───────┘           └──────┬───────┘                  │
│         │ render                    │ persist                  │
│         ▼                          ▼                          │
│  ┌──────────────┐       ┌──────────────┐                      │
│  │  Map Layer   │       │  localStorage│                      │
│  │  (coverage   │       │  (node plans)│                      │
│  │   heatmap)   │       └──────────────┘                      │
│  └──────┬───────┘                                             │
│         │ postMessage                                         │
│         ▼                                                     │
│  ┌──────────────────────────────────┐                         │
│  │  Web Worker: CoverageEngine     │                         │
│  │                                  │                         │
│  │  ┌────────────┐  ┌────────────┐ │                         │
│  │  │ SRTM       │  │ LOS + Link │ │                         │
│  │  │ Tile Cache  │  │ Budget Calc│ │                         │
│  │  └─────┬──────┘  └────────────┘ │                         │
│  │        │ fetch + IndexedDB       │                         │
│  └────────┼─────────────────────────┘                         │
│           │                                                    │
└───────────┼────────────────────────────────────────────────────┘
            │ HTTPS fetch
            ▼
     ┌──────────────┐
     │  AWS S3      │     Terrarium PNG tiles (~2.8 MB per tile)
     │  Elevation   │     Zoom 10 ≈ 90m resolution
     └──────────────┘
```

## Core types

```typescript
interface MeshNode {
  id: string; // nanoid
  name: string; // e.g. "Rooftop Repeater"
  lat: number;
  lng: number;
  antennaHeightM: number; // metres above ground level
  txPowerDbm: number; // e.g. 20, 22, 27, 30
  antennaGainDbi: number; // e.g. 2.15 (stock), 5.8 (tuned)
  role: "client" | "router" | "repeater" | "client_mute";
  color: string; // hex, for heatmap tinting
}

interface LoRaConfig {
  frequencyMhz: number; // 868.0 or 906.875
  bandwidthKhz: number; // 125, 250, 500
  spreadingFactor: number; // 7–12
  codingRate: number; // 5–8 (4/5 to 4/8)
  rxSensitivityDbm: number; // derived from SF+BW
  preset: string; // 'LONG_FAST' | 'LONG_MODERATE' | ...
}

interface CoverageResult {
  nodeId: string;
  grid: Float32Array; // flattened 2D: signal strength dBm per cell
  bounds: { north: number; south: number; east: number; west: number };
  resolution: number; // metres per cell (≈90m)
  cols: number;
  rows: number;
}

interface ElevationProfile {
  points: Array<{
    distanceM: number;
    elevationM: number;
    lat: number;
    lng: number;
  }>;
  fresnelClearance: number[]; // clearance in metres at each point
  isLos: boolean;
  linkBudgetDb: number;
  maxRange: boolean; // within LoRa link budget?
}

interface NodePlan {
  id: string;
  name: string; // "Village Mesh v2"
  nodes: MeshNode[];
  loraConfig: LoRaConfig;
  createdAt: string;
  updatedAt: string;
}
```

## Worker message protocol

```typescript
// Main thread → Worker
type WorkerRequest =
  | {
      type: "CALCULATE_COVERAGE";
      id: string;
      node: MeshNode;
      loraConfig: LoRaConfig;
      radiusKm: number;
      azimuthSteps: number; // default 360
    }
  | {
      type: "CALCULATE_PROFILE";
      id: string;
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      txHeightM: number;
      rxHeightM: number;
      loraConfig: LoRaConfig;
    }
  | {
      type: "CANCEL";
      id: string;
    };

// Worker → Main thread
type WorkerResponse =
  | { type: "COVERAGE_PROGRESS"; id: string; percent: number }
  | { type: "COVERAGE_RESULT"; id: string; result: CoverageResult }
  | { type: "PROFILE_RESULT"; id: string; result: ElevationProfile }
  | { type: "ERROR"; id: string; message: string };
```

## Coverage calculation algorithm

The coverage engine uses a **radial sweep** approach for performance:

1. Pick N radial directions (360, one per degree of azimuth).
2. For each radial, walk outward in steps equal to the SRTM resolution (~90m), building up the elevation profile incrementally.
3. At each step, check LOS (including earth curvature) and calculate received signal strength.
4. If the link budget is exhausted (signal below sensitivity), stop walking that radial.
5. Write the signal strength to the output grid cell.

This reduces work from O(cells × profileLength) to O(radials × maxRadius). 360 radials × 56 steps (5km / 90m) = ~20,000 LOS checks — fast in a Web Worker.

## Meshtastic modem presets

| Preset         | BW (kHz) | SF  | CR  | RX Sensitivity (dBm) |
| -------------- | -------- | --- | --- | -------------------- |
| SHORT_TURBO    | 500      | 7   | 4/5 | -108                 |
| SHORT_FAST     | 250      | 7   | 4/5 | -111                 |
| SHORT_SLOW     | 250      | 8   | 4/5 | -114                 |
| MEDIUM_FAST    | 250      | 9   | 4/5 | -117                 |
| MEDIUM_SLOW    | 250      | 10  | 4/5 | -120                 |
| LONG_FAST      | 250      | 11  | 4/5 | -123                 |
| LONG_MODERATE  | 125      | 11  | 4/8 | -126                 |
| LONG_SLOW      | 125      | 12  | 4/8 | -129                 |
| VERY_LONG_SLOW | 62.5     | 12  | 4/8 | -132                 |

RX sensitivity values are approximate for the SX1262 chipset.

## NodeEditor fields

| Field          | Type            | Default  | Range                    |
| -------------- | --------------- | -------- | ------------------------ |
| name           | text input      | "Node A" | —                        |
| antennaHeightM | slider + number | 5        | 0–100m                   |
| txPowerDbm     | select          | 20       | 14, 17, 20, 22, 27, 30   |
| antennaGainDbi | slider + number | 2.15     | 0–12 dBi                 |
| role           | select          | client   | client, router, repeater |
| color          | colour picker   | auto     | —                        |

## Link analysis summary fields

| Metric                | Example                        |
| --------------------- | ------------------------------ |
| Distance              | 3.42 km                        |
| Status                | ✅ Link viable / ❌ Obstructed |
| Path loss             | 112.4 dB                       |
| Received signal       | -98.2 dBm                      |
| Link margin           | 24.8 dB above sensitivity      |
| Min Fresnel clearance | +12.4 m (at 1.8 km from TX)    |
| TX elevation          | 87 m ASL + 10 m antenna = 97 m |
| RX elevation          | 52 m ASL + 5 m antenna = 57 m  |

## Chunk dependency graph

```
01 Scaffolding ──┬── 02 Node placement ──────────────────┐
                 │                                        │
                 └── 03 SRTM fetcher ── 04 LOS engine ──┤
                                                         ├── 07 Heatmap ── 08 Link analysis
                     05 Link budget ─────────────────────┤
                                                         │
                     03 + 04 + 05 ────── 06 Worker ──────┘
```
