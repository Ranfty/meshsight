# MeshSight

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A pure client-side RF coverage planning tool for Meshtastic LoRa mesh networks. Drop nodes on a terrain map, configure your modem preset, and instantly visualize predicted signal coverage using real elevation data — no backend required.

## Features

- **Coverage heatmaps** — Radial sweep coverage predictions rendered as canvas overlays, coloured by signal strength
- **Terrain-aware RF simulation** — Free-space path loss, knife-edge diffraction (Fresnel-Kirchhoff), and earth curvature correction (k=4/3)
- **Line-of-sight analysis** — Fresnel zone clearance checking across full elevation profiles between any two nodes
- **Link budget** — Full link margin calculation with viable / marginal / not-viable classification
- **Elevation profile chart** — Cross-section between nodes showing terrain, Fresnel zone, and LOS
- **Meshtastic presets** — 9 built-in LoRa modem presets (SHORT_TURBO → VERY_LONG_SLOW) with correct RX sensitivity values
- **Multi-region support** — EU 868 MHz, US 915 MHz, ANZ 915 MHz
- **Per-node configuration** — Antenna height, TX power, antenna gain, device role, colour
- **Persistent state** — Nodes and config saved to localStorage; elevation tiles cached in IndexedDB
- **Responsive UI** — Collapsible sidebar on desktop, full-screen sheet on mobile

## How it works

Elevation data is fetched from [AWS Terrarium PNG tiles](https://registry.opendata.aws/terrain-tiles/) (SRTM3, ~90 m resolution) and decoded client-side. Coverage calculations run in a Web Worker so the UI stays responsive during the radial sweep. Results are transferred back to the main thread via `Float32Array` Transferable objects and rendered onto a canvas layer over the map.

There is no server. The app ships as a static site and works offline after tiles are cached.

## Tech stack

| Concern         | Library                            |
| --------------- | ---------------------------------- |
| Framework       | React 19 + TypeScript              |
| Build           | Vite                               |
| Styling         | Tailwind CSS v4                    |
| UI primitives   | shadcn/ui (Radix UI)               |
| Map             | Leaflet + react-leaflet            |
| State           | Zustand (localStorage persistence) |
| Charts          | Recharts                           |
| Elevation cache | idb-keyval (IndexedDB)             |
| Tests           | Vitest                             |

## Getting started

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npx vitest run     # run engine unit tests
```

## Deployment

The app deploys automatically to GitHub Pages on push to `main` via `.github/workflows/deploy.yaml`. Any static host (Netlify, Cloudflare Pages, etc.) works — just serve the `dist/` directory.

## RF calculation reference

| Formula                    | Expression                                            |
| -------------------------- | ----------------------------------------------------- |
| Free-space path loss       | `FSPL(dB) = 20·log₁₀(d_km) + 20·log₁₀(f_MHz) + 32.44` |
| First Fresnel radius       | `F₁ = √(λ · d₁ · d₂ / D)`                             |
| Earth curvature correction | `Δh = d² / (2 · Rₑ · k)` where k = 4/3                |
| Knife-edge diffraction     | Fresnel-Kirchhoff v-parameter → J(v) approximation    |

LOS is considered clear when 60% of the first Fresnel zone is unobstructed. A link is viable when received power exceeds RX sensitivity + 10 dB fade margin.

## LoRa defaults

- Region: EU_868 (868.0 MHz)
- Preset: LONG_FAST (BW 250 kHz, SF 11, CR 4/5, sensitivity ≈ −123 dBm)
- TX power: 20 dBm
- Antenna gain: 2.15 dBi
- Antenna height: 5 m AGL

## Disclaimer

Coverage predictions are estimates based on terrain elevation data and simplified RF propagation models. They are intended for planning purposes only and do not account for vegetation, buildings, atmospheric conditions, or hardware variation. Always verify links with real-world testing.
