# Chunk 01 — Project Scaffolding + Map

> **Status:** Complete
> **Model:** Sonnet · **Effort:** Medium
> **Depends on:** Nothing
> **Estimated time:** ~2 hours

## Objective

Set up the Vite + React + TypeScript project with a full-screen Leaflet map, dark theme, shadcn/ui, and the basic responsive layout (sidebar + map).

## Deliverables

- [ ] Vite project initialised with React + TypeScript (strict mode)
- [ ] Tailwind CSS v4 configured
- [ ] shadcn/ui initialised (new-york style, slate base, CSS variables enabled)
- [ ] shadcn components added: button, input, label, tabs, separator, scroll-area, sheet
- [ ] All design tokens from CLAUDE.md applied in src/index.css
- [ ] Google Fonts loaded: DM Sans (400, 500, 700) and JetBrains Mono (400, 500)
- [ ] Leaflet map rendering with CartoDB Dark Matter tiles, centred on UK (52.5, -1.5, zoom 7)
- [ ] Tile layer switcher: Dark Matter (default), OpenStreetMap, ESRI Satellite
- [ ] Collapsible sidebar: 360px on desktop, Sheet component on mobile
- [ ] Zustand store initialised with full type definitions and localStorage persistence
- [ ] All TypeScript interfaces from docs/ARCHITECTURE.md defined in src/types/index.ts
- [ ] Project structure matches the layout specified in CLAUDE.md
- [ ] `npm run dev` serves the app, `npm run build` produces a clean production build

## Specifications

**Map tiles:**
- Default: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- OSM: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Satellite: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`

**Sidebar:**
- Header: "MeshSight" in DM Sans 18px bold, with a collapse chevron button
- Three tab placeholders: Nodes, Config, Link (use shadcn Tabs)
- Each tab shows placeholder text for now
- On mobile (< 768px), sidebar is a shadcn Sheet that slides in from the left

**Zustand store initial state:**
```typescript
{
  nodes: [],
  selectedNodeId: null,
  loraConfig: {
    frequencyMhz: 868.0,
    bandwidthKhz: 250,
    spreadingFactor: 11,
    codingRate: 5,
    rxSensitivityDbm: -123,
    preset: 'LONG_FAST',
  },
  mapCenter: { lat: 52.5, lng: -1.5 },
  mapZoom: 7,
  sidebarOpen: true,
  placeMode: false,
  linkAnalysisMode: false,
}
```

**Store must persist:** mapCenter, mapZoom, nodes, loraConfig, sidebarOpen. Do NOT persist placeMode or linkAnalysisMode (these reset to false on reload).

## Key files to create

```
src/types/index.ts          — all interfaces from ARCHITECTURE.md
src/store/useStore.ts       — Zustand store with persist middleware
src/components/map/MapContainer.tsx  — Leaflet wrapper
src/components/sidebar/Sidebar.tsx   — sidebar with tabs
src/lib/utils.ts            — cn() helper for shadcn
src/App.tsx                 — layout: sidebar + map
src/main.tsx                — entry point, Leaflet CSS import
src/index.css               — design tokens, Tailwind base, font imports
```

## Prompt

```
Scaffold a Vite + React + TypeScript project called "meshsight". Read CLAUDE.md
for the full tech stack, project structure, and design tokens. Read
docs/ARCHITECTURE.md for the type definitions.

Set up:
1. Tailwind CSS v4
2. shadcn/ui (new-york style, slate base, CSS variables) — add button, input,
   label, tabs, separator, scroll-area, sheet
3. All design tokens from CLAUDE.md in src/index.css, including the extended
   application tokens and font imports (DM Sans + JetBrains Mono from Google Fonts)
4. A full-viewport layout with a collapsible left sidebar (360px desktop,
   shadcn Sheet on mobile) and a Leaflet map using CartoDB Dark Matter tiles
5. A tile layer switcher for Dark Matter, OSM, and ESRI Satellite
6. Centre the map on the UK (52.5, -1.5, zoom 7)
7. Zustand store with the full state shape and persist middleware (localStorage)
8. All TypeScript interfaces from docs/ARCHITECTURE.md in src/types/index.ts
9. Follow the exact project structure from CLAUDE.md
10. Follow the Leaflet patterns in docs/LEAFLET_PATTERNS.md — especially the
    MapContainer setup, useMapEvents for moveend persistence, and the
    invalidateSize pattern for sidebar toggle
```

## Acceptance criteria

1. `npm run dev` shows a dark-themed map filling the viewport
2. Sidebar opens/closes without breaking the map layout
3. Tile switcher changes the base map
4. Browser refresh preserves map position and zoom
5. TypeScript compiles with zero errors in strict mode
6. `npm run build` produces a clean production bundle
