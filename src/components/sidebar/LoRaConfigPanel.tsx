import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/store/useStore';
import { LORA_PRESETS, REGION_CONFIGS } from '@/data/loraPresets';

function formatCodingRate(cr: number): string {
  return `4/${cr}`;
}

export default function LoRaConfigPanel() {
  const loraConfig = useStore((s) => s.loraConfig);
  const setLoraConfig = useStore((s) => s.setLoraConfig);

  const currentRegion =
    REGION_CONFIGS.find((r) => r.frequencyMhz === loraConfig.frequencyMhz) ??
    REGION_CONFIGS[0];

  const handlePresetChange = (presetName: string) => {
    const preset = LORA_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setLoraConfig({
      preset: preset.name,
      bandwidthKhz: preset.bandwidthKhz,
      spreadingFactor: preset.spreadingFactor,
      codingRate: preset.codingRate,
      rxSensitivityDbm: preset.rxSensitivityDbm,
    });
  };

  const handleRegionChange = (regionName: string) => {
    const region = REGION_CONFIGS.find((r) => r.name === regionName);
    if (!region) return;
    setLoraConfig({ frequencyMhz: region.frequencyMhz });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-foreground mb-3">LoRa Settings</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-muted-foreground">Preset</label>
            <Select value={loraConfig.preset} onValueChange={handlePresetChange}>
              <SelectTrigger className="text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LORA_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name} className="text-[13px]">
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-muted-foreground">Region</label>
            <Select value={currentRegion.name} onValueChange={handleRegionChange}>
              <SelectTrigger className="text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGION_CONFIGS.map((region) => (
                  <SelectItem key={region.name} value={region.name} className="text-[13px]">
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <p className="text-sm font-bold text-foreground mb-3">Derived Parameters</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Frequency', value: `${loraConfig.frequencyMhz} MHz` },
            { label: 'Bandwidth', value: `${loraConfig.bandwidthKhz} kHz` },
            { label: 'Spreading Factor', value: `SF${loraConfig.spreadingFactor}` },
            { label: 'Coding Rate', value: formatCodingRate(loraConfig.codingRate) },
            { label: 'RX Sensitivity', value: `${loraConfig.rxSensitivityDbm} dBm` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted rounded-md p-2.5">
              <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
              <p className="font-mono text-[13px] font-medium text-foreground mt-0.5">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
