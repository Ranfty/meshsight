export interface MeshNode {
  id: string; // nanoid
  name: string; // e.g. "Rooftop Repeater"
  lat: number;
  lng: number;
  antennaHeightM: number; // metres above ground level
  txPowerDbm: number; // e.g. 20, 22, 27, 30
  antennaGainDbi: number; // e.g. 2.15 (stock), 5.8 (tuned)
  role: 'client' | 'router' | 'repeater' | 'client_mute';
  color: string; // hex, for heatmap tinting
}

export interface LoRaConfig {
  frequencyMhz: number; // 868.0 or 906.875
  bandwidthKhz: number; // 125, 250, 500
  spreadingFactor: number; // 7–12
  codingRate: number; // 5–8 (4/5 to 4/8)
  rxSensitivityDbm: number; // derived from SF+BW
  preset: string; // 'LONG_FAST' | 'LONG_MODERATE' | ...
}

export interface CoverageResult {
  nodeId: string;
  grid: Float32Array; // flattened 2D: signal strength dBm per cell
  bounds: { north: number; south: number; east: number; west: number };
  resolution: number; // metres per cell (≈90m)
  cols: number;
  rows: number;
}

export interface ElevationProfile {
  points: Array<{
    distanceM: number;
    elevationM: number;
    lat: number;
    lng: number;
  }>;
  fresnelClearance: number[]; // clearance in metres at each point
  isLos: boolean;
  linkBudgetDb: number;
  maxRange: boolean; // within LoRa link budget?
}

export interface NodePlan {
  id: string;
  name: string; // "Village Mesh v2"
  nodes: MeshNode[];
  loraConfig: LoRaConfig;
  createdAt: string;
  updatedAt: string;
}

// Worker message protocol

export type WorkerRequest =
  | {
      type: 'CALCULATE_COVERAGE';
      id: string;
      node: MeshNode;
      loraConfig: LoRaConfig;
      radiusKm: number;
      azimuthSteps: number; // default 360
    }
  | {
      type: 'CALCULATE_PROFILE';
      id: string;
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      txHeightM: number;
      rxHeightM: number;
      loraConfig: LoRaConfig;
    }
  | {
      type: 'CANCEL';
      id: string;
    };

export type WorkerResponse =
  | { type: 'COVERAGE_PROGRESS'; id: string; percent: number }
  | { type: 'COVERAGE_RESULT'; id: string; result: CoverageResult }
  | { type: 'PROFILE_RESULT'; id: string; result: ElevationProfile }
  | { type: 'ERROR'; id: string; message: string };
