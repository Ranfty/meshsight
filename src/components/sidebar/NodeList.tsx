import { Eye, EyeOff, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export default function NodeList() {
  const nodes = useStore((s) => s.nodes);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const nodeVisibility = useStore((s) => s.nodeVisibility);
  const selectNode = useStore((s) => s.selectNode);
  const removeNode = useStore((s) => s.removeNode);
  const flyTo = useStore((s) => s.flyTo);
  const setNodeVisibility = useStore((s) => s.setNodeVisibility);

  if (nodes.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-0.5">
      {nodes.map((node) => {
        const isSelected = node.id === selectedNodeId;
        const isVisible = nodeVisibility[node.id] !== false;
        return (
          <Card
            key={node.id}
            onClick={() => {
              selectNode(node.id);
              flyTo(node.lat, node.lng);
            }}
            className={cn(
              "flex-row items-center gap-2.5 p-2.5 cursor-pointer",
              "hover:bg-muted/60 transition-colors duration-150",
              isSelected
                ? "border-primary border-l-[3px] bg-primary/5"
                : "border-border",
              !isVisible && "opacity-50",
            )}
          >
            {/* Colour dot */}
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
              style={{ backgroundColor: node.color }}
            />

            {/* Name + coords */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-[13px] font-medium truncate",
                  isSelected ? "text-foreground" : "text-foreground/90",
                )}
              >
                {node.name}
              </p>
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                {node.lat.toFixed(4)}°, {node.lng.toFixed(4)}°
              </p>
            </div>

            {/* Role badge */}
            <Badge
              variant="outline"
              className="font-mono text-[10px] font-medium tracking-wider uppercase flex-shrink-0 px-1.5 py-0 border-border/60"
            >
              {node.role}
            </Badge>

            {/* Visibility toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNodeVisibility(node.id, !isVisible);
                  }}
                  aria-label={isVisible ? `Hide ${node.name}` : `Show ${node.name}`}
                >
                  {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isVisible ? "Hide" : "Show"} {node.name}
              </TooltipContent>
            </Tooltip>

            {/* Delete */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(node.id);
                  }}
                  aria-label={`Delete ${node.name}`}
                >
                  <Trash2 size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Delete {node.name}</TooltipContent>
            </Tooltip>
          </Card>
        );
      })}

      <p className="text-[11px] font-mono text-muted-foreground mt-0.5 flex items-center gap-1">
        <MapPin size={10} />
        {nodes.length} node{nodes.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
