import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import MapView from '@/components/map/MapContainer';
import Sidebar from '@/components/sidebar/Sidebar';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useStore } from '@/store/useStore';

export default function App() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const sidebarOpen = useStore((s) => s.sidebarOpen);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar isMobile={false} />}

      {/* Mobile sidebar (Sheet) */}
      {isMobile && <Sidebar isMobile={true} />}

      {/* Map area */}
      <div className="relative flex-1 min-w-0">
        <MapView />

        {/* Desktop sidebar toggle — always visible at the left edge of the map */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="absolute top-4 left-3 z-[1000] flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors duration-150 shadow-sm"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Mobile menu button */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-[1000] flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--map-overlay-bg))] backdrop-blur-sm border border-border text-foreground hover:text-primary transition-colors duration-150"
            aria-label="Open sidebar"
          >
            <Menu size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
