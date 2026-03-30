---
name: Chunk 08 — Link analysis + LoRa config panel complete
description: Link analysis (ElevationProfileChart, LinkAnalysis panel, useLinkProfileManager), LoRa config panel, sidebar tabs wired up
type: project
---

Chunk 08 is complete. Delivered:
- `src/data/chartTheme.ts` — Recharts colour/font constants
- `src/hooks/useLinkProfileManager.ts` — watches linkEndpoints, triggers CALCULATE_PROFILE, auto-switches to Link tab on result
- `src/components/map/ElevationProfileChart.tsx` — Recharts AreaChart with terrain, Fresnel zone, LOS dashed line; Fresnel zone rendered BEFORE terrain so terrain fill (opaque) covers it below ground level
- `src/components/sidebar/LinkAnalysis.tsx` — chart + 8-metric link summary grid; computes accurate link budget on frontend using actual node txPower/antennaGain (worker uses defaults)
- `src/components/sidebar/LoRaConfigPanel.tsx` — 9-preset Select + 3-region Select; changing either updates store → triggers coverage recalculation
- Store additions: linkEndpoints, linkProfile, linkProfileCalculating, activeTab
- Sidebar tabs are now controlled (value={activeTab}); Link Analysis toggle added to header header (mutually exclusive with place mode)
- NodeMarker: linkEndpointRole prop ('tx'=green ring, 'rx'=blue ring)
- MapContainer: LinkPolyline (dashed grey) between endpoints, LinkProfileOrchestrator mounted

**Why:** Chunk 08 from the phase 1 plan.
**How to apply:** All link analysis state is in the store. useLinkProfileManager is called from MapContainer's LinkProfileOrchestrator component.
