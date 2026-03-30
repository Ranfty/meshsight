import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, ZoomControl, useMapEvents, useMap } from 'react-leaflet';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { createNode } from '@/lib/nodeUtils';
import { useCoverageManager } from '@/hooks/useCoverageManager';
import NodeMarker from './NodeMarker';
import CoverageLayer, { CoveragePaneInit } from './CoverageLayer';
import type L from 'leaflet';

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

// ── Map event handler — persists position + handles place mode clicks ─────────
// Uses getState() inside event callbacks to avoid stale closures.

function MapEventHandler() {
  useMapEvents({
    click(e) {
      const { placeMode, nextNodeIndex, addNode, selectNode } = useStore.getState();
      if (!placeMode) return;
      const node = createNode(e.latlng.lat, e.latlng.lng, nextNodeIndex);
      addNode(node);
      selectNode(node.id);
    },
    moveend(e) {
      const map = e.target;
      const center = map.getCenter();
      useStore.getState().setMapCenter({ lat: center.lat, lng: center.lng });
      useStore.getState().setMapZoom(map.getZoom());
    },
  });

  return null;
}

// ── Fly-to handler — responds to flyTarget in store ─────────────────────────

function FlyToHandler() {
  const map = useMap();
  const flyTarget = useStore((s) => s.flyTarget);
  const clearFlyTarget = useStore((s) => s.clearFlyTarget);

  useEffect(() => {
    if (flyTarget) {
      map.flyTo(
        [flyTarget.lat, flyTarget.lng],
        flyTarget.zoom ?? map.getZoom(),
        { duration: 0.6 },
      );
      clearFlyTarget();
    }
  }, [map, flyTarget, clearFlyTarget]);

  return null;
}

// ── Sidebar resize handler ────────────────────────────────────────────────────

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

// ── Coverage orchestrator — manages worker lifecycle ─────────────────────────

function CoverageOrchestrator() {
  useCoverageManager();
  return null;
}

// ── Coverage overlays — one ImageOverlay per node with a result ──────────────

function CoverageLayers() {
  const nodes = useStore((s) => s.nodes);
  const coverageResults = useStore((s) => s.coverageResults);
  const nodeVisibility = useStore((s) => s.nodeVisibility);
  const rxSensitivityDbm = useStore((s) => s.loraConfig.rxSensitivityDbm);

  return (
    <>
      {nodes.map((node) => {
        const result = coverageResults[node.id];
        if (!result) return null;
        const visible = nodeVisibility[node.id] !== false;
        return (
          <CoverageLayer
            key={node.id}
            result={result}
            nodeColor={node.color}
            rxSensitivityDbm={rxSensitivityDbm}
            visible={visible}
          />
        );
      })}
    </>
  );
}

// ── Node markers renderer ───────────────────────────────────────────────────

function NodeMarkers() {
  const nodes = useStore((s) => s.nodes);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const coverageProgress = useStore((s) => s.coverageProgress);
  const selectNode = useStore((s) => s.selectNode);
  const updateNode = useStore((s) => s.updateNode);

  const handleSelect = useCallback((id: string) => {
    selectNode(id);
  }, [selectNode]);

  const handleDragEnd = useCallback((id: string, latlng: L.LatLng) => {
    updateNode(id, { lat: latlng.lat, lng: latlng.lng });
  }, [updateNode]);

  return (
    <>
      {nodes.map((node) => (
        <NodeMarker
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          isCalculating={node.id in coverageProgress}
          progress={coverageProgress[node.id] ?? 0}
          onSelect={handleSelect}
          onDragEnd={handleDragEnd}
        />
      ))}
    </>
  );
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
      <div className="pointer-events-auto rounded-lg bg-[var(--map-overlay-bg)] backdrop-blur-sm border border-border p-2 flex flex-col gap-1">
        {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'text-[11px] font-mono px-2 py-1 rounded transition-colors duration-150 text-left',
              activeLayer === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {TILE_LAYERS[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Signal strength legend ──────────────────────────────────────────────────

function SignalLegend() {
  const nodes = useStore((s) => s.nodes);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const rxSensitivityDbm = useStore((s) => s.loraConfig.rxSensitivityDbm);

  if (nodes.length === 0) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[0];
  const swatchColor = selectedNode.color;
  const s = rxSensitivityDbm;

  const tiers = [
    { label: 'Excellent', range: `> ${s + 30} dBm`,          alpha: 180 },
    { label: 'Good',      range: `${s + 20}–${s + 30} dBm`,  alpha: 130 },
    { label: 'Fair',      range: `${s + 10}–${s + 20} dBm`,  alpha: 90  },
    { label: 'Edge',      range: `${s}–${s + 10} dBm`,        alpha: 50  },
  ];

  return (
    <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
      <div className="rounded-lg bg-[var(--map-overlay-bg)] backdrop-blur-sm border border-border p-3 flex flex-col gap-1.5">
        <p className="font-mono text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
          Signal
        </p>
        {tiers.map((tier) => (
          <div key={tier.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: swatchColor, opacity: tier.alpha / 255 }}
            />
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[10px] font-medium text-foreground">
                {tier.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {tier.range}
              </span>
            </div>
          </div>
        ))}
        <p className="font-mono text-[10px] text-muted-foreground/50 mt-0.5 leading-tight">
          Predicted
        </p>
      </div>
    </div>
  );
}

// ── Main map component ──────────────────────────────────────────────────────

export default function MapView() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const placeMode = useStore((s) => s.placeMode);
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('dark');

  const { mapCenter, mapZoom } = useStore.getState();
  const initialCenter = useRef<[number, number]>([mapCenter.lat, mapCenter.lng]);
  const initialZoom = useRef(mapZoom);

  const tile = TILE_LAYERS[activeLayer];

  return (
    <div className="relative h-full w-full">
      <LeafletMapContainer
        center={initialCenter.current}
        zoom={initialZoom.current}
        zoomControl={false}
        className={cn('h-full w-full', placeMode && 'cursor-crosshair')}
      >
        <ZoomControl position="bottomright" />
        <TileLayer attribution={tile.attribution} url={tile.url} />
        <MapEventHandler />
        <FlyToHandler />
        <SidebarResizeHandler sidebarOpen={sidebarOpen} />
        <CoveragePaneInit />
        <CoverageOrchestrator />
        <CoverageLayers />
        <NodeMarkers />
      </LeafletMapContainer>

      <TileSwitcher activeLayer={activeLayer} onChange={setActiveLayer} />
      <SignalLegend />
    </div>
  );
}
