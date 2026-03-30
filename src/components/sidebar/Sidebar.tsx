import { useCallback } from "react";
import { Radio, Settings2, Link, Crosshair } from "lucide-react";
import iconSvg from "/icon.svg";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import NodeList from "./NodeList";
import NodeEditor from "./NodeEditor";
import LoRaConfigPanel from "./LoRaConfigPanel";
import LinkAnalysis from "./LinkAnalysis";

// ── Sidebar content (shared between desktop and mobile) ────────────────────

function SidebarContent() {
  const placeMode = useStore((s) => s.placeMode);
  const setPlaceMode = useStore((s) => s.setPlaceMode);
  const linkAnalysisMode = useStore((s) => s.linkAnalysisMode);
  const setLinkAnalysisMode = useStore((s) => s.setLinkAnalysisMode);
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const nodes = useStore((s) => s.nodes);
  const selectedNodeId = useStore((s) => s.selectedNodeId);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handlePlaceModeChange = useCallback(
    (active: boolean) => {
      setPlaceMode(active);
    },
    [setPlaceMode],
  );

  const handleLinkModeChange = useCallback(
    (active: boolean) => {
      setLinkAnalysisMode(active);
    },
    [setLinkAnalysisMode],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between gap-2">
        <div className="flex flex-row gap-2">
          <img src={iconSvg} className="h-8 w-8" alt="MeshSight" />
          <div>
            <h1 className="font-bold text-lg leading-tight">MeshSight</h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wider">
              LoRa Coverage Planner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={linkAnalysisMode}
                onPressedChange={handleLinkModeChange}
                size="lg"
                variant="outline"
                aria-label="Toggle link analysis mode"
                className="h-8 w-8"
              >
                <Link size={16} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              {linkAnalysisMode ? "Link analysis active" : "Link analysis"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={placeMode}
                onPressedChange={handlePlaceModeChange}
                size="lg"
                variant="outline"
                aria-label="Toggle place mode"
                className="h-8 w-8"
              >
                <Crosshair size={16} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              {placeMode ? "Place mode active" : "Place node"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Separator />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger
            value="nodes"
            className="flex items-center gap-1.5 text-[13px]"
          >
            <Radio size={14} />
            Nodes
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className="flex items-center gap-1.5 text-[13px]"
          >
            <Settings2 size={14} />
            Config
          </TabsTrigger>
          <TabsTrigger
            value="link"
            className="flex items-center gap-1.5 text-[13px]"
          >
            <Link size={14} />
            Link
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0 mt-3">
          <TabsContent
            value="nodes"
            className="px-4 pb-4 mt-0 flex flex-col gap-3"
          >
            {nodes.length === 0 && (
              <p className="text-[13px] text-muted-foreground">
                No nodes placed yet. Use the{" "}
                <span className="inline-flex items-center gap-0.5 text-foreground">
                  <Crosshair size={12} className="inline" />
                </span>{" "}
                button above to start placing nodes.
              </p>
            )}
            <NodeList />
            {selectedNode && (
              <>
                <Separator />
                <NodeEditor node={selectedNode} />
              </>
            )}
          </TabsContent>

          <TabsContent value="config" className="px-4 pb-4 mt-0">
            <LoRaConfigPanel />
          </TabsContent>

          <TabsContent value="link" className="px-4 pb-4 mt-0">
            <LinkAnalysis />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// ── Desktop sidebar ─────────────────────────────────────────────────────────

function DesktopSidebar({ open }: { open: boolean }) {
  return (
    <div
      className={cn(
        "flex-shrink-0 bg-card border-r border-border overflow-hidden transition-all duration-200",
        open ? "w-[360px]" : "w-0",
      )}
    >
      <div className="h-full w-[360px]">
        <SidebarContent />
      </div>
    </div>
  );
}

// ── Mobile sidebar (Sheet) ──────────────────────────────────────────────────

function MobileSidebar({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onToggle}>
      <SheetContent side="left" className="p-0 w-[360px] bg-card border-border">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

// ── Exported sidebar — responsive ───────────────────────────────────────────

export default function Sidebar({ isMobile }: { isMobile: boolean }) {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  const toggle = useCallback(
    () => setSidebarOpen(!sidebarOpen),
    [setSidebarOpen, sidebarOpen],
  );

  if (isMobile) {
    return <MobileSidebar open={sidebarOpen} onToggle={toggle} />;
  }

  return <DesktopSidebar open={sidebarOpen} />;
}
