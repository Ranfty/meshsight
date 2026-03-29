import { nanoid } from 'nanoid';
import type { MeshNode } from '@/types';

// ── Node marker colour palette ─────────────────────────────────────────────
//
// These are the resolved hex values for --node-0 through --node-7 in index.css.
// Hex is required here because:
//   • DivIcon HTML strings use them as inline CSS background values
//   • The future heatmap canvas renderer needs RGB components (hexToRgb)
// Must stay in sync with the --node-N definitions in src/index.css.

export const NODE_COLORS = [
  '#3ecf8e', // --node-0: green  hsl(153 66% 48%)
  '#3b82f6', // --node-1: blue   hsl(217 71% 53%)
  '#f59e42', // --node-2: orange hsl(35  92% 57%)
  '#8b5cf6', // --node-3: purple hsl(262 83% 58%)
  '#ef4444', // --node-4: red    hsl(0   72% 51%)
  '#33cccc', // --node-5: cyan   hsl(180 60% 50%)
  '#dd408f', // --node-6: pink   hsl(330 70% 56%)
  '#f3d125', // --node-7: yellow hsl(50  90% 55%)
] as const;

// ── Auto-name generator: A, B, ..., Z, AA, AB, ..., AZ, BA, ... ──────────────

export function generateNodeLabel(index: number): string {
  let label = '';
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Node ${label}`;
}

// ── Factory — creates a MeshNode with auto-generated name and colour ──────────
// Pass nextNodeIndex from the store (monotonically incrementing) so names and
// colours stay unique even after nodes are deleted.

export function createNode(lat: number, lng: number, nodeIndex: number): MeshNode {
  return {
    id: nanoid(),
    name: generateNodeLabel(nodeIndex),
    lat,
    lng,
    antennaHeightM: 5,
    txPowerDbm: 20,
    antennaGainDbi: 2.15,
    role: 'client',
    color: NODE_COLORS[nodeIndex % NODE_COLORS.length],
  };
}
