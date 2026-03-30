# Chunk 05 — LoRa Link Budget + Presets

> **Status:** Complete
> **Model:** Sonnet · **Effort:** Medium
> **Depends on:** Nothing (can be done in parallel with chunks 03/04)
> **Estimated time:** ~2 hours

## Objective

Calculate whether a LoRa link between two nodes will work, given the path loss and Meshtastic modem presets. Populate the presets data file with real Meshtastic values.

## Deliverables

- [ ] `src/data/loraPresets.ts` — all Meshtastic modem presets with BW, SF, CR, RX sensitivity
- [ ] `src/engine/propagation.ts` — free-space path loss + knife-edge diffraction model
- [ ] `src/engine/linkbudget.ts` — full link budget calculator
- [ ] EU_868 and US_915 frequency configs
- [ ] Vitest tests against hand-calculated values

## Link budget equation

```
Received power (dBm) = TX power + TX antenna gain + RX antenna gain - path loss

Link works if: received power > RX sensitivity + fade margin
```

## Module APIs

```typescript
// src/engine/propagation.ts

/** Free-space path loss in dB */
function fsplDb(distanceKm: number, frequencyMhz: number): number;

/** Knife-edge diffraction loss (Fresnel-Kirchhoff) */
function diffractionLossDb(
  fresnelClearanceM: number,
  fresnelRadiusM: number,
): number;

// src/engine/linkbudget.ts

interface LinkBudgetResult {
  txPowerDbm: number;
  txAntennaGainDbi: number;
  rxAntennaGainDbi: number;
  pathLossDb: number;
  diffractionLossDb: number;
  receivedPowerDbm: number;
  rxSensitivityDbm: number;
  marginDb: number; // received - sensitivity
  fadeMarginDb: number; // configurable, default 10
  linkViable: boolean; // margin > fadeMargin
  maxRangeKm: number; // theoretical max in free space
}

function calculateLinkBudget(
  distanceKm: number,
  frequencyMhz: number,
  txPowerDbm: number,
  txAntennaGainDbi: number,
  rxAntennaGainDbi: number,
  rxSensitivityDbm: number,
  fadeMarginDb?: number, // default 10
  fresnelClearanceM?: number, // if provided, adds diffraction loss
  fresnelRadiusM?: number,
): LinkBudgetResult;

// src/data/loraPresets.ts

interface LoRaPreset {
  name: string; // 'LONG_FAST'
  label: string; // 'Long Fast'
  bandwidthKhz: number;
  spreadingFactor: number;
  codingRate: number; // 5 = 4/5, 8 = 4/8
  rxSensitivityDbm: number;
}

interface RegionConfig {
  name: string; // 'EU_868'
  label: string; // 'Europe 868 MHz'
  frequencyMhz: number;
  maxTxPowerDbm: number;
}

const LORA_PRESETS: LoRaPreset[];
const REGION_CONFIGS: RegionConfig[];
```

## Prompt

```
Create the LoRa link budget calculator and Meshtastic presets.
Read CLAUDE.md for the RF calculation reference and LoRa defaults.
Read docs/ARCHITECTURE.md for the modem presets table.

1. Create src/data/loraPresets.ts with:
   - All 9 Meshtastic modem presets (SHORT_TURBO through VERY_LONG_SLOW)
     with bandwidth, spreading factor, coding rate, and RX sensitivity for SX1262
   - Region configs: EU_868 (868.0 MHz, 27 dBm max), US_915 (906.875 MHz, 30 dBm max),
     ANZ_915 (916.0 MHz, 30 dBm max)

2. Create src/engine/propagation.ts with:
   - fsplDb(distanceKm, frequencyMhz) — free-space path loss
     Formula: 20×log10(d_km) + 20×log10(f_MHz) + 32.44
   - diffractionLossDb(fresnelClearanceM, fresnelRadiusM) — knife-edge model
     Uses Fresnel-Kirchhoff parameter: v = clearance × sqrt(2 / (λ × d1 × d2 / D))
     Approximation: if v > 1: 0 dB, if v > -1: 6 + 9v + 1.5v², else: 13 + 20×log10(v)

3. Create src/engine/linkbudget.ts with:
   - calculateLinkBudget() as specified above
   - maxRangeKm: solve FSPL = txPower + gains - sensitivity - fadeMargin for distance

Write Vitest tests:
- FSPL at 1km, 868 MHz → ~90.7 dB (hand calc: 20×log10(1) + 20×log10(868) + 32.44 = 0 + 58.77 + 32.44 = 91.21)
- FSPL at 5km, 868 MHz → ~105.2 dB
- LONG_FAST, 20 dBm TX, 2.15 dBi antennas, 5km free space → viable (margin > 10 dB)
- LONG_FAST, 20 dBm TX, 2.15 dBi antennas, 50km free space → NOT viable
- Diffraction loss with positive clearance → ~0 dB
- Diffraction loss with negative clearance → positive loss in dB
```

## Acceptance criteria

1. FSPL at 1km/868MHz returns ~91.2 ±0.5 dB
2. LONG_FAST at 5km with stock antennas reports link viable
3. LONG_FAST at 50km with stock antennas reports link NOT viable
4. All 9 presets and 3 regions are defined with correct values
5. `npx vitest run` passes all tests
