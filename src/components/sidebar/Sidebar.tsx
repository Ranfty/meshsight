import { Radio, Settings2, Link } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

// ── Sidebar content (shared between desktop and mobile) ────────────────────

function SidebarContent() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-lg font-bold text-foreground">MeshSight</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">RF Coverage Planner</p>
      </div>

      <Separator />

      <Tabs defaultValue="nodes" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="nodes" className="flex items-center gap-1.5 text-[13px]">
            <Radio size={14} />
            Nodes
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1.5 text-[13px]">
            <Settings2 size={14} />
            Config
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-1.5 text-[13px]">
            <Link size={14} />
            Link
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-3">
          <TabsContent value="nodes" className="px-4 pb-4 mt-0">
            <p className="text-[13px] text-muted-foreground">
              No nodes placed yet. Enable place mode and click the map to add nodes.
            </p>
          </TabsContent>

          <TabsContent value="config" className="px-4 pb-4 mt-0">
            <p className="text-[13px] text-muted-foreground">
              LoRa configuration will appear here.
            </p>
          </TabsContent>

          <TabsContent value="link" className="px-4 pb-4 mt-0">
            <p className="text-[13px] text-muted-foreground">
              Select two nodes on the map to analyse the link between them.
            </p>
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
        'flex-shrink-0 bg-card border-r border-border overflow-hidden transition-all duration-200',
        open ? 'w-[var(--sidebar-width)]' : 'w-0'
      )}
    >
      <div className="h-full w-[var(--sidebar-width)]">
        <SidebarContent />
      </div>
    </div>
  );
}

// ── Mobile sidebar (Sheet) ──────────────────────────────────────────────────

function MobileSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Sheet open={open} onOpenChange={onToggle}>
      <SheetContent side="left" className="p-0 w-[var(--sidebar-width)] bg-card border-border">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

// ── Exported sidebar — responsive ───────────────────────────────────────────

export default function Sidebar({ isMobile }: { isMobile: boolean }) {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  const toggle = () => setSidebarOpen(!sidebarOpen);

  if (isMobile) {
    return <MobileSidebar open={sidebarOpen} onToggle={toggle} />;
  }

  return <DesktopSidebar open={sidebarOpen} />;
}
