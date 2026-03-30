export interface LoRaPreset {
  name: string; // 'LONG_FAST'
  label: string; // 'Long Fast'
  bandwidthKhz: number;
  spreadingFactor: number;
  codingRate: number; // 5 = 4/5, 8 = 4/8
  rxSensitivityDbm: number;
}

export interface RegionConfig {
  name: string; // 'EU_868'
  label: string; // 'Europe 868 MHz'
  frequencyMhz: number;
  maxTxPowerDbm: number;
}

export const LORA_PRESETS: LoRaPreset[] = [
  { name: 'SHORT_TURBO',   label: 'Short Turbo',    bandwidthKhz: 500,  spreadingFactor: 7,  codingRate: 5, rxSensitivityDbm: -108 },
  { name: 'SHORT_FAST',    label: 'Short Fast',     bandwidthKhz: 250,  spreadingFactor: 7,  codingRate: 5, rxSensitivityDbm: -111 },
  { name: 'SHORT_SLOW',    label: 'Short Slow',     bandwidthKhz: 250,  spreadingFactor: 8,  codingRate: 5, rxSensitivityDbm: -114 },
  { name: 'MEDIUM_FAST',   label: 'Medium Fast',    bandwidthKhz: 250,  spreadingFactor: 9,  codingRate: 5, rxSensitivityDbm: -117 },
  { name: 'MEDIUM_SLOW',   label: 'Medium Slow',    bandwidthKhz: 250,  spreadingFactor: 10, codingRate: 5, rxSensitivityDbm: -120 },
  { name: 'LONG_FAST',     label: 'Long Fast',      bandwidthKhz: 250,  spreadingFactor: 11, codingRate: 5, rxSensitivityDbm: -123 },
  { name: 'LONG_MODERATE', label: 'Long Moderate',  bandwidthKhz: 125,  spreadingFactor: 11, codingRate: 8, rxSensitivityDbm: -126 },
  { name: 'LONG_SLOW',     label: 'Long Slow',      bandwidthKhz: 125,  spreadingFactor: 12, codingRate: 8, rxSensitivityDbm: -129 },
  { name: 'VERY_LONG_SLOW',label: 'Very Long Slow', bandwidthKhz: 62.5, spreadingFactor: 12, codingRate: 8, rxSensitivityDbm: -132 },
];

export const REGION_CONFIGS: RegionConfig[] = [
  { name: 'EU_868',  label: 'Europe 868 MHz',    frequencyMhz: 868.0,   maxTxPowerDbm: 27 },
  { name: 'US_915',  label: 'United States 915 MHz', frequencyMhz: 906.875, maxTxPowerDbm: 30 },
  { name: 'ANZ_915', label: 'Australia/NZ 915 MHz',  frequencyMhz: 916.0,   maxTxPowerDbm: 30 },
];
