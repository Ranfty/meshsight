import { useEffect, useState } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, ZoomControl, useMapEvents, useMap } from 'react-leaflet';
import { useStore } from '@/store/useStore';

// ── Tile layer definitions ──────────────────────────────────────────────────

const TILE_LAYERS = {
  dark: {
    label: 'Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  osm: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
} as const;

type TileLayerKey = keyof typeof TILE_LAYERS;

// ── Map event handler — persists position to store ─────────────────────────

function MapEventHandler() {
  const setMapCenter = useStore((s) => s.setMapCenter);
  const setMapZoom = useStore((s) => s.setMapZoom);

  useMapEvents({
    moveend(e) {
      const map = e.target;
      const center = map.getCenter();
      const zoom = map.getZoom();
      setMapCenter({ lat: center.lat, lng: center.lng });
      setMapZoom(zoom);
    },
  });

  return null;
}

// ── Sidebar resize handler — invalidates map size after CSS transition ──────

function SidebarResizeHandler({ sidebarOpen }: { sidebarOpen: boolean }) {
  const map = useMap();

  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 250);
    return () => clearTimeout(timeout);
  }, [map, sidebarOpen]);

  return null;
}

// ── Tile layer switcher control ─────────────────────────────────────────────

function TileSwitcher({
  activeLayer,
  onChange,
}: {
  activeLayer: TileLayerKey;
  onChange: (key: TileLayerKey) => void;
}) {
  return (
    <div className="absolute top-3 right-3 z-[1000] pointer-events-none">
      <div className="pointer-events-auto rounded-lg bg-[hsl(var(--map-overlay-bg))] backdrop-blur-sm border border-border p-2 flex flex-col gap-1">
        {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`text-[11px] font-mono px-2 py-1 rounded transition-colors duration-150 text-left ${
              activeLayer === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {TILE_LAYERS[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main map component ──────────────────────────────────────────────────────

export default function MapView() {
  const mapCenter = useStore((s) => s.mapCenter);
  const mapZoom = useStore((s) => s.mapZoom);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('dark');

  const tile = TILE_LAYERS[activeLayer];

  return (
    <div className="relative h-full w-full">
      <LeafletMapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={mapZoom}
        zoomControl={false}
        className="h-full w-full"
      >
        <ZoomControl position="bottomright" />
        <TileLayer attribution={tile.attribution} url={tile.url} />
        <MapEventHandler />
        <SidebarResizeHandler sidebarOpen={sidebarOpen} />
      </LeafletMapContainer>

      <TileSwitcher activeLayer={activeLayer} onChange={setActiveLayer} />
    </div>
  );
}
