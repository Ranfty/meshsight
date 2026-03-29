import { useCallback } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/store/useStore";
import { NODE_COLORS } from "@/lib/nodeUtils";
import { cn } from "@/lib/utils";
import type { MeshNode } from "@/types";

// ── Colour picker popover ────────────────────────────────────────────────────

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* dynamic user colour — inline style is the only option here */}
        <button
          className="w-6 h-6 rounded-full border-2 border-border hover:border-muted-foreground transition-colors duration-150 flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-label="Choose node colour"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div className="grid grid-cols-4 gap-1.5">
          {NODE_COLORS.map((hex) => (
            <button
              key={hex}
              onClick={() => onChange(hex)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all duration-150 hover:scale-110",
                color === hex
                  ? "border-foreground scale-110"
                  : "border-transparent",
              )}
              style={{ backgroundColor: hex }} // dynamic palette colour
              aria-label={hex}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Role labels — all four MeshNode role values ──────────────────────────────

const ROLE_LABELS: Record<MeshNode["role"], string> = {
  client: "Client",
  router: "Router",
  repeater: "Repeater",
  client_mute: "Client (mute)",
};

// ── NodeEditor ───────────────────────────────────────────────────────────────

interface NodeEditorProps {
  node: MeshNode;
}

export default function NodeEditor({ node }: NodeEditorProps) {
  const updateNode = useStore((s) => s.updateNode);
  const removeNode = useStore((s) => s.removeNode);

  const update = useCallback(
    (updates: Partial<MeshNode>) => updateNode(node.id, updates),
    [node.id, updateNode],
  );

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-bold text-foreground">Edit Node</p>

      <Separator />

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label>Name</Label>
        <Input
          value={node.name}
          onChange={(e) => update({ name: e.target.value })}
          className="h-8 text-[13px]"
        />
      </div>

      {/* Antenna height */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Antenna height</Label>
          <span className="font-mono text-[13px] font-medium text-foreground">
            {node.antennaHeightM}{" "}
            <span className="font-mono text-[11px] text-muted-foreground tracking-wide">
              m
            </span>
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[node.antennaHeightM]}
          onValueChange={([v]) => update({ antennaHeightM: v })}
          className="w-full"
        />
      </div>

      {/* TX power */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[13px]">TX power</Label>
        <Select
          value={String(node.txPowerDbm)}
          onValueChange={(v) => update({ txPowerDbm: Number(v) })}
        >
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[14, 17, 20, 22, 27, 30].map((dbm) => (
              <SelectItem
                key={dbm}
                value={String(dbm)}
                className="text-[13px] font-mono"
              >
                {dbm} dBm
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Antenna gain */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[13px]">Antenna gain</Label>
          <span className="font-mono text-[13px] font-medium text-foreground">
            {node.antennaGainDbi.toFixed(2)}{" "}
            <span className="font-mono text-[11px] text-muted-foreground tracking-wide">
              dBi
            </span>
          </span>
        </div>
        <Slider
          min={0}
          max={12}
          step={0.1}
          value={[node.antennaGainDbi]}
          onValueChange={([v]) =>
            update({ antennaGainDbi: Math.round(v * 10) / 10 })
          }
          className="w-full"
        />
      </div>

      {/* Role */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[13px]">Role</Label>
        <Select
          value={node.role}
          onValueChange={(v) => update({ role: v as MeshNode["role"] })}
        >
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(ROLE_LABELS) as [MeshNode["role"], string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value} className="text-[13px]">
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Colour */}
      <div className="flex items-center justify-between">
        <Label className="text-[13px]">Colour</Label>
        <ColorPicker
          color={node.color}
          onChange={(hex) => update({ color: hex })}
        />
      </div>

      <Separator />

      {/* Coordinates (read-only) */}
      <div className="flex gap-3 text-[11px] font-mono text-muted-foreground">
        <span>{node.lat.toFixed(5)}°</span>
        <span>{node.lng.toFixed(5)}°</span>
      </div>

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        className="w-full mt-1 gap-2"
        onClick={() => removeNode(node.id)}
      >
        <Trash2 size={14} />
        Delete node
      </Button>
    </div>
  );
}
