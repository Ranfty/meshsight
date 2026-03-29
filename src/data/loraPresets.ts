import type { LoRaConfig } from '@/types';

export interface LoRaPreset {
  name: string;
  config: Omit<LoRaConfig, 'preset'>;
}

export const LORA_PRESETS: Record<string, LoRaPreset> = {
  SHORT_TURBO: {
    name: 'Short Turbo',
    config: { frequencyMhz: 868.0, bandwidthKhz: 500, spreadingFactor: 7, codingRate: 5, rxSensitivityDbm: -108 },
  },
  SHORT_FAST: {
    name: 'Short Fast',
    config: { frequencyMhz: 868.0, bandwidthKhz: 250, spreadingFactor: 7, codingRate: 5, rxSensitivityDbm: -111 },
  },
  SHORT_SLOW: {
    name: 'Short Slow',
    config: { frequencyMhz: 868.0, bandwidthKhz: 250, spreadingFactor: 8, codingRate: 5, rxSensitivityDbm: -114 },
  },
  MEDIUM_FAST: {
    name: 'Medium Fast',
    config: { frequencyMhz: 868.0, bandwidthKhz: 250, spreadingFactor: 9, codingRate: 5, rxSensitivityDbm: -117 },
  },
  MEDIUM_SLOW: {
    name: 'Medium Slow',
    config: { frequencyMhz: 868.0, bandwidthKhz: 250, spreadingFactor: 10, codingRate: 5, rxSensitivityDbm: -120 },
  },
  LONG_FAST: {
    name: 'Long Fast',
    config: { frequencyMhz: 868.0, bandwidthKhz: 250, spreadingFactor: 11, codingRate: 5, rxSensitivityDbm: -123 },
  },
  LONG_MODERATE: {
    name: 'Long Moderate',
    config: { frequencyMhz: 868.0, bandwidthKhz: 125, spreadingFactor: 11, codingRate: 8, rxSensitivityDbm: -126 },
  },
  LONG_SLOW: {
    name: 'Long Slow',
    config: { frequencyMhz: 868.0, bandwidthKhz: 125, spreadingFactor: 12, codingRate: 8, rxSensitivityDbm: -129 },
  },
  VERY_LONG_SLOW: {
    name: 'Very Long Slow',
    config: { frequencyMhz: 868.0, bandwidthKhz: 62.5, spreadingFactor: 12, codingRate: 8, rxSensitivityDbm: -132 },
  },
};
