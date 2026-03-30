# Chunk 08 — Link Analysis + LoRa Config Panel

> **Status:** Complete
> **Model:** Sonnet · **Effort:** Medium
> **Depends on:** Chunks 04, 05, 07
> **Estimated time:** ~3 hours

## Objective

Click two nodes to see a detailed link analysis: elevation profile chart with Fresnel zone, LOS line, earth curvature, and a summary of link viability. Also implement the LoRa config panel.

## Deliverables

- [ ] "Link Analysis" mode toggle in sidebar header (Link icon)
- [ ] Click two nodes in sequence to trigger profile calculation
- [ ] Dashed line drawn between selected nodes on the map
- [ ] `src/components/map/ElevationProfileChart.tsx` — Recharts elevation profile
- [ ] `src/components/sidebar/LinkAnalysis.tsx` — chart + summary table
- [ ] `src/components/sidebar/LoRaConfigPanel.tsx` — preset + region selector
- [ ] Elevation profile shows: terrain, LOS line, Fresnel zone boundary
- [ ] Fresnel zone coloured green where clear, red where obstructed
- [ ] Link summary table with all metrics from ARCHITECTURE.md
- [ ] Changing LoRa preset/region triggers recalculation of all coverage layers

## Specifications

Follow docs/RECHARTS_THEME.md exactly for all chart styling — colours, fonts, axes, tooltip, and the `isAnimationActive={false}` rule.

See docs/ARCHITECTURE.md for the link analysis summary fields table.

**Link analysis UX:**
1. User clicks Link icon toggle in sidebar → enters link analysis mode
2. User clicks first node marker → highlighted with a ring
3. User clicks second node marker → triggers CALCULATE_PROFILE in Worker
4. Dashed Polyline appears between the two nodes on the map
5. Sidebar switches to the Link tab showing the elevation profile chart and summary
6. Clicking a different node replaces the second endpoint and recalculates
7. Toggling link analysis mode off clears the selection and polyline

**Elevation profile chart (Recharts AreaChart):**
- X axis: distance in km (JetBrains Mono, 11px)
- Y axis: elevation in m ASL (JetBrains Mono, 11px)
- Terrain: filled area, `#2a3142` fill, `#3a4458` stroke
- LOS line: dashed line, `#8892a4`
- Fresnel zone: translucent area around LOS line, `#8b5cf6` at 0.12 opacity
- Custom tooltip matching dark theme (see docs/RECHARTS_THEME.md)
- Height: 220px in the sidebar
- No animation, no legend

**Link summary panel (below the chart):**
- Grid of metric cards, 2 columns
- Each card: label (DM Sans 13px dim) + value (JetBrains Mono 13px bold)
- Status uses green check / red X icon + text
- Link margin uses colour: green > 20 dB, orange > 10 dB, red > 0 dB, grey if no link

**LoRa config panel (Config tab):**
- Preset: shadcn Select with all 9 presets, shows label ("Long Fast")
- Region: shadcn Select with EU_868, US_915, ANZ_915
- Read-only display below: BW, SF, CR, RX Sensitivity (JetBrains Mono)
- Changing preset auto-fills the derived values in the store
- Changing preset or region triggers recalculation of ALL coverage layers

## Prompt

```
Implement link analysis and the LoRa config panel. Read docs/RECHARTS_THEME.md
for exact chart styling. Read docs/ARCHITECTURE.md for the link summary fields.
Read CLAUDE.md for design tokens and conventions.

1. Add a "Link Analysis" toggle (Link icon, shadcn Toggle) in the sidebar header.
   When active, clicking two node markers triggers CALCULATE_PROFILE via the
   Worker. Draw a dashed Polyline between them on the map (see LEAFLET_PATTERNS.md).

2. Create src/components/sidebar/LinkAnalysis.tsx:
   - Recharts AreaChart showing terrain profile, LOS line (dashed), and
     Fresnel zone boundary (purple translucent area)
   - Follow RECHARTS_THEME.md exactly: isAnimationActive={false}, custom tooltip,
     JetBrains Mono axes, correct colours
   - Chart height 220px
   - Below the chart: link summary as a 2-column grid of metric cards
   - Metrics: distance, status (✅/❌), path loss, received signal, link margin,
     min Fresnel clearance, TX elevation, RX elevation

3. Create src/components/sidebar/LoRaConfigPanel.tsx:
   - Preset dropdown (shadcn Select) with all 9 Meshtastic presets
   - Region dropdown with EU_868, US_915, ANZ_915
   - Read-only derived values: BW, SF, CR, Sensitivity (JetBrains Mono)
   - Changing either triggers store update → recalculation of all coverage layers

4. Wire up the Config tab in the sidebar to show LoRaConfigPanel
5. Wire up the Link tab to show LinkAnalysis (only when two nodes selected)
```

## Acceptance criteria

1. Can enter link analysis mode and click two nodes
2. Dashed line appears between them on the map
3. Elevation profile chart shows terrain, LOS line, and Fresnel zone
4. Chart follows RECHARTS_THEME.md exactly (dark theme, monospace axes, no animation)
5. Link summary shows all metrics with correct colour-coded status
6. LoRa preset dropdown shows all 9 presets and updates derived values
7. Changing preset recalculates all coverage layers
8. Changing region recalculates all coverage layers
9. Link analysis mode can be toggled off, clearing the selection and polyline
