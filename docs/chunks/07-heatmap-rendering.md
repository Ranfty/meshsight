# Chunk 07 — Coverage Heatmap Rendering

> **Status:** Not started
> **Model:** Sonnet · **Effort:** Medium
> **Depends on:** Chunks 02, 06
> **Estimated time:** ~3 hours

## Objective

Render the CoverageResult as a semi-transparent coloured overlay on the Leaflet map. Each node's coverage is a separate toggleable layer. Include a signal strength legend and progress indicators.

## Deliverables

- [ ] `src/components/map/CoverageLayer.tsx` — renders one node's coverage as ImageOverlay
- [ ] Canvas-based heatmap rendering (offscreen canvas → data URL → ImageOverlay)
- [ ] Node colour used as hue, opacity varies by signal strength
- [ ] Per-node layer toggling (eye icon on each node in the list)
- [ ] Coverage recalculates on node drag (debounced) and on LoRa config change
- [ ] Progress indicator on node marker during calculation (pulsing animation)
- [ ] Signal strength legend overlay in bottom-left corner of map
- [ ] Custom Leaflet pane for coverage layers (below markers)
- [ ] Smooth fade-in when coverage appears

## Specifications

Follow the ImageOverlay pattern in docs/LEAFLET_PATTERNS.md exactly — especially the offscreen canvas approach and the custom pane for layer ordering.

**Colour mapping:**
```
Signal above rxSensitivity + 40 dB → node colour, alpha 0.55 (excellent)
Signal at rxSensitivity + 20 dB    → node colour, alpha 0.35 (good)
Signal at rxSensitivity             → node colour, alpha 0.15 (edge)
Signal below rxSensitivity          → transparent (no coverage)
```

The alpha ramps linearly between these breakpoints.

**Legend:**
- Position: bottom-left corner, floating over the map
- Background: `var(--map-overlay-bg)` with `backdrop-blur-sm`
- Shows 4 colour swatches: Excellent, Good, Fair, Edge
- Uses the currently selected node's colour (or primary green if none selected)
- Labels in JetBrains Mono 11px

**Progress indicator:**
- While Worker is calculating, the node marker pulses (`animate-pulse`)
- A small percentage text appears below the marker (e.g. "42%")
- On completion, pulse stops and coverage fades in over 300ms

**Recalculation triggers:**
- Node dragged to new position (debounce 500ms after dragend)
- Node antenna height, TX power, or antenna gain changed (debounce 300ms)
- LoRa config preset or region changed (recalculate ALL nodes)

**Layer visibility:**
- Add an eye/eye-off toggle icon to each node card in NodeList
- Store visibility state per node in Zustand
- Hidden layers are not rendered but their CoverageResult is kept in memory

## Prompt

```
Implement coverage heatmap rendering. Read docs/LEAFLET_PATTERNS.md for the
ImageOverlay and custom pane patterns. Read CLAUDE.md for design tokens
(signal colours, map overlay background).

1. Create src/components/map/CoverageLayer.tsx:
   - Takes a CoverageResult, node colour, and rxSensitivity
   - Renders coverage as an offscreen canvas → data URL → Leaflet ImageOverlay
   - Maps signal strength to node colour with linearly ramping alpha
   - Uses a custom "coveragePane" (zIndex 350) to sit below markers
   - Supports visibility toggle

2. Wire up coverage calculation:
   - When a node is placed or moved, trigger Worker calculation via useCoverageWorker
   - Debounce recalculation (500ms for drag, 300ms for property changes)
   - Store CoverageResult per node in Zustand
   - On LoRa config change, recalculate all nodes

3. Add progress indicators:
   - Pulsing animation on marker during calculation
   - Percentage text below marker
   - Fade-in (opacity transition 300ms) when coverage appears

4. Add a signal legend overlay:
   - Bottom-left of map, absolutely positioned div (not Leaflet Control)
   - Uses map-overlay-bg + backdrop-blur
   - Shows Excellent/Good/Fair/Edge with colour swatches and dBm ranges
   - Updates colours when selected node changes

5. Add per-node visibility toggles:
   - Eye/EyeOff icon on each node card in NodeList
   - Store visibility per node in Zustand
   - Hidden = not rendered, but CoverageResult kept in memory
```

## Acceptance criteria

1. Placing a node triggers coverage calculation and shows a heatmap
2. Heatmap colour matches the node's assigned colour
3. Dragging a node recalculates coverage (with visible progress indicator)
4. Changing LoRa preset recalculates all nodes
5. Eye icon toggles heatmap visibility without recalculating
6. Legend displays correct colour scale
7. Coverage layers sit below node markers (custom pane)
8. Multiple nodes show overlapping coverage (additive opacity)
