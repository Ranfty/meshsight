# CLAUDE.md

## Project overview

MeshSight is a pure client-side web application that helps Meshtastic operators plan node placements using terrain-aware RF coverage prediction. Users drop node pins on a map and see predicted LoRa signal coverage heatmaps calculated from real elevation data.

There is no backend. The app ships as a static site (GitHub Pages / Netlify). All computation happens in the browser using Web Workers. Elevation data is fetched from public tile servers and cached in IndexedDB.

## Tech stack

- **Language:** TypeScript (strict mode) throughout
- **Framework:** React 18+ with functional components and hooks only
- **Build:** Vite
- **Styling:** Tailwind CSS v4 with CSS custom properties for design tokens
- **UI primitives:** shadcn/ui (built on Radix UI primitives, copied into `src/components/ui/`)
- **Map:** Leaflet via react-leaflet
- **State:** Zustand with `persist` middleware (localStorage)
- **Charts:** Recharts
- **Icons:** lucide-react
- **Elevation tile cache:** idb-keyval (IndexedDB)
- **IDs:** nanoid
- **Testing:** Vitest

## Project structure

```
src/
  components/
    ui/               # shadcn/ui primitives — DO NOT hand-write, use `npx shadcn@latest add <component>`
    map/              # MapContainer, NodeMarker, CoverageLayer, ElevationProfileChart
    sidebar/          # Sidebar, NodeList, NodeEditor, LoRaConfigPanel, LinkAnalysis
  engine/             # All computation — runs in Web Workers, no React dependencies
    coverage.worker.ts
    srtm.ts
    los.ts
    linkbudget.ts
    propagation.ts
    geo.ts
  hooks/              # Custom React hooks (useCoverageWorker, useMediaQuery, etc.)
  store/
    useStore.ts
  data/
    loraPresets.ts
  lib/
    utils.ts          # shadcn cn() helper and shared utilities
  types/
    index.ts
```

## UI component library: shadcn/ui

We use shadcn/ui for all interactive primitives. These are Radix UI primitives pre-styled with Tailwind, copied into the project (not installed as a package dependency).

**Setup:** The project must be initialised with `npx shadcn@latest init` using the "new-york" style, the slate base colour, and CSS variables enabled.

**Adding components:** Always use the CLI to add components:
```bash
npx shadcn@latest add slider
npx shadcn@latest add select
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add toggle
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add badge
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add tabs
npx shadcn@latest add card
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
npx shadcn@latest add sheet
```

**Required components for Phase 1:**
- `button` — place mode toggle, delete, recalculate
- `input` + `label` — node name, numeric fields
- `slider` — antenna height, antenna gain
- `select` — TX power, device role, LoRa preset, region
- `tooltip` — icon button labels, metric explanations
- `toggle` — place mode, link analysis mode
- `card` — node list items, link summary
- `badge` — node role, signal strength category
- `sheet` — mobile sidebar (slide-over)
- `tabs` — sidebar panel switching (Nodes / Config / Link)
- `separator` — visual dividers in sidebar panels
- `scroll-area` — scrollable node list
- `dialog` — export/import confirmation
- `popover` — colour picker

**Rules:**
- Never hand-write components that shadcn provides. Use the CLI to add them, then customise the theme via CSS variables.
- Never install `@radix-ui/*` packages directly. shadcn handles Radix as transitive dependencies.
- Import shadcn components from `@/components/ui/<name>`, e.g. `import { Button } from "@/components/ui/button"`.
- The `cn()` utility (from `src/lib/utils.ts`) must be used for all conditional class merging. Never use string concatenation for Tailwind classes.

## Design system

MeshSight uses a dark, technical aesthetic inspired by RF engineering tools and military C2 displays. The palette is cool and muted with a single vibrant accent colour (green) used for interactive elements and positive states.

### Colour system — shadcn preset (oklch)

The project uses the **shadcn Tailwind preset** (`shadcn/tailwind.css`). Colour variables use `oklch()` format, **not** HSL. Do not introduce HSL-format CSS variables or `hsl(var(--*))` wrapper calls — these are invalid with oklch values.

Dark mode is applied via `class="dark"` on `<body>` in `index.html`. All shadcn dark-mode colours live in the `.dark {}` block in `src/index.css`.

**Key dark-mode colours (from `.dark {}` in `index.css`):**

| Token | oklch | Role |
|---|---|---|
| `--background` | `oklch(0.145 0 0)` | App background |
| `--foreground` | `oklch(0.985 0 0)` | Primary text |
| `--card` | `oklch(0.205 0 0)` | Sidebar / card surface |
| `--popover` | `oklch(0.30 0 0)` | Floating UI (dropdowns, popovers) — intentionally **lighter** than card |
| `--primary` | `oklch(0.432 0.095 166.913)` | Green accent |
| `--muted` | `oklch(0.269 0 0)` | Subtle backgrounds |
| `--border` | `oklch(1 0 0 / 10%)` | Borders |

To customise the theme: edit the `:root {}` (light) or `.dark {}` (dark) blocks in `src/index.css`. Do not hardcode colour values in components — always use Tailwind semantic classes (`bg-card`, `text-muted-foreground`, etc.).

### MeshSight-specific tokens

These live in `:root {}` in `index.css` and work in both themes:

```css
--sidebar-width: 360px;
--map-overlay-bg: oklch(0.145 0 0 / 0.85);  /* semi-transparent panel over map */
```

Use as `w-[360px]` (hardcoded, not `var()`) for the sidebar width, and `bg-[var(--map-overlay-bg)]` for map overlay panels.

### Node marker colours

Node colours are hardcoded hex constants in `src/lib/nodeUtils.ts` (`NODE_COLORS` array). Hex is used because the heatmap canvas renderer requires RGB components. The 8 colours cycle through green → blue → orange → purple → red → cyan → pink → yellow.

Do **not** define `--node-*` CSS variables — they served no purpose once we moved to oklch and the hex constants are the source of truth.

### Typography

Fonts are loaded from Google Fonts: `DM Sans` (400, 500, 700) and `JetBrains Mono` (400, 500).

```css
@layer base {
  body {
    font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  code, .font-mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
}
```

| Usage                     | Font            | Size   | Weight | Tailwind class example              |
|---------------------------|-----------------|--------|--------|--------------------------------------|
| Sidebar heading           | DM Sans         | 18px   | 700    | `text-lg font-bold`                  |
| Panel heading             | DM Sans         | 14px   | 700    | `text-sm font-bold`                  |
| Body / labels             | DM Sans         | 13px   | 400    | `text-[13px]`                        |
| Numeric values / data     | JetBrains Mono  | 13px   | 500    | `font-mono text-[13px] font-medium`  |
| Metric units (dBm, km)    | JetBrains Mono  | 11px   | 400    | `font-mono text-[11px] tracking-wide`|
| Badge text                | JetBrains Mono  | 10px   | 500    | `font-mono text-[10px] font-medium tracking-wider uppercase` |
| Map legend                | JetBrains Mono  | 11px   | 400    | `font-mono text-[11px]`             |

### Spacing & layout

- Sidebar internal padding: `p-4` (16px)
- Card/panel padding: `p-3.5` (14px)
- Gap between sidebar panels: `gap-3` (12px)
- Gap between form fields: `gap-2.5` (10px)
- Map control insets: 12px from edge
- Border radius: `rounded-lg` (8px) for cards, `rounded-md` (6px) for inputs, `rounded` (4px) for badges

### Interaction patterns

- **Focus:** Green ring (`ring-ring`) on all interactive elements via shadcn defaults
- **Hover on cards/list items:** `hover:bg-muted` transition
- **Active/selected node:** Left border accent — `border-l-[3px] border-primary` on the node list item
- **Disabled controls:** `opacity-40 pointer-events-none`
- **Loading/calculating:** Pulsing opacity animation (`animate-pulse`) on the node marker
- **Transitions:** `transition-colors duration-150` for hover/focus; `duration-200` for panel open/close

### Icon conventions

Use `lucide-react` for all icons. Size 16px (`size={16}`) in controls, 14px inline with text.

Key icon mappings:
- `Crosshair` — place mode
- `Link` — link analysis
- `Trash2` — delete node
- `Download` / `Upload` — export / import plan
- `Radio` — node / antenna
- `Mountain` — elevation
- `Settings2` — LoRa config
- `ChevronLeft` / `ChevronRight` — collapse / expand sidebar
- `RotateCcw` — recalculate coverage
- `Eye` / `EyeOff` — toggle coverage layer visibility
- `GripVertical` — drag handle (if needed)

## Key architecture rules

- **`src/engine/` must have zero React imports.** These modules run inside a Web Worker. They must be pure TypeScript with no DOM or React dependencies. Only import from other engine modules, `idb-keyval`, and standard Web APIs.
- **All heavy computation goes through the Web Worker.** Never run LOS calculations, coverage sweeps, or elevation lookups on the main thread. Use `postMessage` / `onmessage` with the typed `WorkerRequest` / `WorkerResponse` protocol defined in `types/index.ts`.
- **Use Transferable objects** for `Float32Array` results from the Worker to avoid copying large buffers.
- **Elevation tiles are cached in IndexedDB**, not localStorage. Tiles are ~2.8 MB each. Use `idb-keyval` with keys like `terrarium-10-512-340`.
- **State lives in Zustand.** No prop drilling deeper than one level. Components read from the store directly via hooks. The store persists to localStorage via middleware.
- **No backend calls except elevation tile fetches.** The app must work after initial load with only cached tiles.

## Elevation data

We use Mapzen Terrarium PNG tiles from AWS S3:
```
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
```

- Zoom level 10 gives ~90m resolution (close to SRTM3)
- Elevation decoded from RGB: `height = (R * 256 + G + B / 256) - 32768`
- These tiles are CORS-enabled and publicly accessible
- Decoded tile data is cached in IndexedDB to avoid re-fetching

## RF calculation reference

These constants and formulae are used across the engine modules:

- **Earth radius:** 6,371,000 m
- **Effective earth radius (k=4/3):** 8,494,667 m
- **Earth curvature correction at distance d:** `d² / (2 × Re × k)`
- **Free-space path loss:** `FSPL(dB) = 20×log10(d_km) + 20×log10(f_MHz) + 32.44`
- **Fresnel zone 1 radius at point d from TX:** `F1 = sqrt(λ × d × (D-d) / D)` where λ = c/f
- **LOS is clear when** 60% of F1 is unobstructed at all profile points
- **Link is viable when** received power exceeds RX sensitivity + fade margin (default 10 dB)

## LoRa defaults

- **Region:** EU_868 (868.0 MHz)
- **Preset:** LONG_FAST (BW 250 kHz, SF 11, CR 4/5, RX sensitivity ≈ -123 dBm)
- **TX power:** 20 dBm
- **Antenna gain:** 2.15 dBi (stock dipole)
- **Antenna height:** 5 m AGL
- **Coverage radius:** 5 km
- **Azimuth steps:** 360 (one per degree)

## Coding conventions

- Use `interface` over `type` for object shapes
- Name files in camelCase (components in PascalCase)
- Prefer named exports over default exports, except for React components which use default export
- Keep components under 200 lines — extract hooks and helpers into `src/hooks/`
- All engine functions must be pure where possible (deterministic output for given input)
- Use descriptive variable names — `antennaHeightM` not `h`, `distanceKm` not `d`
- Units are always in the variable name: `M` for metres, `Km` for kilometres, `Dbm` for dBm, `Dbi` for dBi, `Mhz` for MHz
- Error handling: engine functions throw typed errors, UI catches and displays them
- Use the `cn()` utility from `src/lib/utils.ts` for all conditional Tailwind class merging
- Tailwind classes only — no inline styles, no CSS modules, no styled-components
- Colour values must reference CSS custom properties via Tailwind (`bg-primary`, `text-muted-foreground`), never hardcoded hex values in components

## Testing

- Tests live next to the module they test: `los.test.ts` alongside `los.ts`
- Engine modules must have unit tests — these are the core of the product
- Test elevation lookups against known summits (e.g. Ben Nevis: 56.7969°N, 5.0036°W, expect ~1345m ±20m)
- Test LOS with synthetic profiles: flat terrain (clear), hill obstruction (blocked), earth-curvature-only blockage (long distance)
- Test link budget against hand-calculated values for LONG_FAST preset
- Run tests with `npx vitest run`

## UI/UX notes

- Dark theme throughout — the map uses CartoDB Dark Matter tiles
- All UI text uses the DM Sans / JetBrains Mono type stack defined in the design tokens
- Numeric data and units always render in JetBrains Mono for alignment and readability
- The sidebar is 360px on desktop, full-screen sheet (shadcn `Sheet`) on mobile
- "Place mode" must be explicitly toggled (Crosshair icon) to avoid accidental node placement when panning
- Coverage heatmaps use the node's assigned colour with opacity varying by signal strength
- Show a progress indicator during Worker calculations
- Label all coverage as "predicted" — this is a planning tool, not a guarantee
- Panels over the map (legend, controls) use `bg-[hsl(var(--map-overlay-bg))]` with `backdrop-blur-sm`

## Commands

```bash
npm run dev                           # Start dev server
npm run build                         # Production build
npm run preview                       # Preview production build
npx vitest run                        # Run tests once
npx vitest                            # Run tests in watch mode
npx shadcn@latest add <component>     # Add a shadcn/ui component
```
