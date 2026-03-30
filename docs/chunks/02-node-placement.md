# Chunk 02 — Node Placement + Management

> **Status:** Complete
> **Model:** Sonnet · **Effort:** Medium
> **Depends on:** Chunk 01
> **Estimated time:** ~3 hours

## Objective

Click the map to place nodes. Drag to reposition. Edit properties in the sidebar. Delete nodes. All state persisted.

## Deliverables

- [ ] "Place mode" toggle button in sidebar header (Crosshair icon)
- [ ] Clicking the map in place mode creates a new MeshNode with defaults
- [ ] Custom circular Leaflet markers (DivIcon) — coloured, with node initial letter
- [ ] Markers are draggable — store updates on dragend
- [ ] Clicking a marker selects it and opens NodeEditor panel
- [ ] NodeEditor with fields: name, antennaHeightM, txPowerDbm, antennaGainDbi, role, colour
- [ ] NodeList panel showing all nodes with delete buttons
- [ ] Clicking a node in the list centres the map on it and opens the editor
- [ ] Selected node has visual distinction (larger marker, white border, left accent on list item)
- [ ] Auto-generated node names: "Node A", "Node B", ... "Node Z", "Node AA", etc.
- [ ] Auto-assigned colours cycling through the --node-0 through --node-7 palette
- [ ] All changes persist via Zustand store (survive page refresh)
- [ ] shadcn components used: button, input, label, slider, select, toggle, card, tooltip, popover (for colour picker)

## Specifications

See docs/ARCHITECTURE.md for the MeshNode interface and NodeEditor fields table.

Follow the DivIcon marker pattern in docs/LEAFLET_PATTERNS.md exactly — especially `className: ''`, `useMemo` for the icon, and `useMemo` for eventHandlers.

**Place mode UX:**

- Toggle button shows Crosshair icon, highlights green when active
- Map cursor changes to crosshair when place mode is active (CSS on the map container)
- Clicking the map in place mode creates a node and immediately exits place mode
- Clicking the map when NOT in place mode does normal map interaction

**NodeEditor layout:**

- Node name: shadcn Input
- Antenna height: shadcn Slider (0–100m, step 1) with numeric display
- TX power: shadcn Select (14, 17, 20, 22, 27, 30 dBm)
- Antenna gain: shadcn Slider (0–12 dBi, step 0.1) with numeric display
- Role: shadcn Select (client, router, repeater)
- Colour: small colour swatch button → shadcn Popover with the 8 palette colours
- Delete button at the bottom (destructive variant)

**Numeric displays** for sliders use JetBrains Mono with the unit suffix (e.g. "5 m", "2.15 dBi").

## Prompt

```
Implement node placement and management for meshsight. Read CLAUDE.md for
conventions and design tokens, docs/ARCHITECTURE.md for the MeshNode interface
and NodeEditor fields, and docs/LEAFLET_PATTERNS.md for the DivIcon marker pattern.

Add shadcn components needed: slider, select, toggle, card, tooltip, popover.

Implement:
1. A "place mode" toggle (Crosshair icon, shadcn Toggle) in the sidebar header.
   When active, map cursor is crosshair. Clicking the map creates a MeshNode
   with auto-generated name ("Node A", "Node B", ...) and auto-assigned colour
   from the --node-N palette. Place mode deactivates after placing.

2. Custom circular DivIcon markers following the exact pattern from
   docs/LEAFLET_PATTERNS.md — className: '', useMemo for icon AND
   eventHandlers, draggable with dragend updating the store.

3. Selected node: larger marker (28px vs 22px), white border, left accent
   border on the node list item.

4. NodeEditor panel in the sidebar Nodes tab with: name (Input), antenna
   height (Slider 0-100m), TX power (Select), antenna gain (Slider 0-12 dBi),
   role (Select), colour (Popover with palette swatches), delete (Button
   destructive). Numeric values in JetBrains Mono with unit suffixes.

5. NodeList panel above the editor showing all nodes as Cards with name,
   truncated coordinates, role badge, and a delete icon button. Clicking
   centres the map and opens the editor.

6. All state persisted via Zustand. Test by placing nodes, refreshing, and
   verifying they're still there.
```

## Acceptance criteria

1. Can place a node by toggling place mode and clicking the map
2. Node appears with correct colour and letter on the map
3. Can drag the node to a new position — coordinates update in the editor
4. Can edit all properties and see changes reflected on the marker
5. Can delete a node from the editor or the list
6. Refreshing the page preserves all nodes and their properties
7. On mobile, the sidebar Sheet opens when a node is tapped
