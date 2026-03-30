# Contributing to MeshSight

Thanks for your interest in contributing! This guide will help you get started.

## Development setup

```bash
git clone https://github.com/YOUR_USERNAME/meshsight.git
cd meshsight
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` with HMR.

## Code style

- **TypeScript strict mode** — all code must pass `tsc -b` without errors
- **Functional components only** — no class components
- **Tailwind CSS** — use semantic classes, never inline styles
- **shadcn/ui** — use the CLI to add UI components, never hand-write them
- **Units in variable names** — `distanceKm`, `heightM`, `powerDbm`, `frequencyMhz`
- **Named exports** — except React components which use default export
- **Pure functions in `src/engine/`** — no React or DOM dependencies

Run `npm run lint` before submitting.

## Testing

Engine modules (RF calculations, elevation, LOS) must have unit tests:

```bash
npx vitest run # run once
npx vitest     # watch mode
```

Tests live next to the module: `los.test.ts` alongside `los.ts`. Test against known values where possible (e.g. Ben Nevis elevation, hand-calculated link budgets).

## File structure

- `src/components/` — React UI components
- `src/components/ui/` — shadcn/ui primitives (added via CLI, not hand-written)
- `src/engine/` — Pure TypeScript RF calculation engine, runs in Web Worker
- `src/hooks/` — Custom React hooks
- `src/store/` — Zustand state management
- `src/types/` — TypeScript types and interfaces

## Submitting changes

1. Fork and create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and test locally
3. Run `npm run lint` and `npm run test` — both must pass
4. Commit with a clear message (see PR template for format)
5. Push and open a PR

## What to work on

Good first issues:

- Bug fixes with test coverage
- Documentation improvements
- Refactoring within a single module (no architecture changes)

Larger features:

- New LoRa presets or regions
- Additional RF propagation models (Hata, ITM)
- Export/import formats (KML, GeoJSON)
- Mobile UI enhancements

**Please discuss major changes in an issue first** before investing time in a large PR.

## RF calculations

If modifying engine modules, verify against:

- Free-space path loss (FSPL) hand-calculated values
- Known terrain summits (Ben Nevis: 56.7969°N, 5.0036°W, ~1345m)
- Fresnel zone clearance using published test profiles

See `CLAUDE.md` for the complete RF reference.

## Questions?

Open an issue with the `question` label, or reach out on the Meshtastic community Discord.
