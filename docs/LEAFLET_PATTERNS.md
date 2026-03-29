# Leaflet Patterns for MeshSight

Reference for all react-leaflet patterns used in this project. Follow these patterns exactly — do not improvise alternative approaches.

## Version

- `leaflet`: ^1.9
- `react-leaflet`: ^5.x (hooks-based API only, no class components)
- `@types/leaflet`: ^1.9

## CSS import

Leaflet CSS **must** be imported once at the app root, before any map component renders:

```tsx
// src/main.tsx
import 'leaflet/dist/leaflet.css';
```

## MapContainer setup

`MapContainer` props are **immutable after mount** — `center` and `zoom` only set the initial view. To change the view programmatically, use the `useMap()` hook inside a child component.

```tsx
// src/components/map/MapContainer.tsx
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';

export default function Map() {
  return (
    <MapContainer
      center={[52.5, -1.5]}
      zoom={7}
      zoomControl={false}           // we position it manually
      className="h-full w-full"
      // IMPORTANT: do NOT set style={{ height: '100%' }} — use Tailwind
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {/* Child components that need map access go here */}
    </MapContainer>
  );
}
```

## Accessing the map instance

Always use `useMap()` inside a child component of `MapContainer`. Never try to pass a ref to `MapContainer` directly.

```tsx
import { useMap } from 'react-leaflet';

function MapViewController({ center, zoom }: { center: L.LatLngExpression; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null; // renderless component
}
```

## Map events (click, move, zoom)

Use `useMapEvents()` — it returns the map instance and attaches handlers. This must be a child of `MapContainer`.

```tsx
import { useMapEvents } from 'react-leaflet';

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
    moveend(e) {
      // persist map position to store
      const map = e.target;
      const center = map.getCenter();
      const zoom = map.getZoom();
      // update zustand store...
    },
  });

  return null;
}
```

## Custom markers with DivIcon

react-leaflet does not support React components inside DivIcon natively. Use `L.divIcon` with an HTML string. Do NOT use `react-leaflet-div-icon` or `ReactDOM.createPortal` into marker icons — it's fragile and unnecessary for our simple circular markers.

```tsx
import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import { useMemo, useRef } from 'react';

interface NodeMarkerProps {
  node: MeshNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, latlng: L.LatLng) => void;
}

export default function NodeMarker({ node, isSelected, onSelect, onDragEnd }: NodeMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  // Recreate icon only when colour/selection changes
  const icon = useMemo(() => {
    const size = isSelected ? 28 : 22;
    const border = isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.5)';
    return L.divIcon({
      className: '', // IMPORTANT: empty string removes default .leaflet-div-icon styling
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${node.color};
        border: ${border};
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 700;
        color: #0c0f14;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        cursor: grab;
        transition: all 150ms ease;
      ">${node.name.charAt(0)}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, [node.color, node.name, isSelected]);

  const eventHandlers = useMemo(
    () => ({
      click() {
        onSelect(node.id);
      },
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          onDragEnd(node.id, marker.getLatLng());
        }
      },
    }),
    [node.id, onSelect, onDragEnd]
  );

  return (
    <Marker
      ref={markerRef}
      position={[node.lat, node.lng]}
      icon={icon}
      draggable
      eventHandlers={eventHandlers}
    >
      <Tooltip direction="top" offset={[0, -14]} opacity={0.9}>
        <span className="font-mono text-xs">{node.name}</span>
      </Tooltip>
    </Marker>
  );
}
```

**Key rules for DivIcon:**
- Always set `className: ''` to remove default white-bg + black-border styling
- `iconSize` and `iconAnchor` must be set for correct positioning
- Keep the HTML string simple — no event handlers, no complex DOM
- Memoize the icon with `useMemo` to avoid unnecessary re-renders

## Coverage heatmap with ImageOverlay

The coverage grid is rendered as a canvas, converted to a data URL, and displayed as a Leaflet `ImageOverlay`. This avoids per-cell DOM elements and performs well with large grids.

```tsx
import { ImageOverlay } from 'react-leaflet';
import { useMemo } from 'react';

interface CoverageLayerProps {
  result: CoverageResult;
  nodeColor: string;
  rxSensitivityDbm: number;
  visible: boolean;
}

export default function CoverageLayer({
  result,
  nodeColor,
  rxSensitivityDbm,
  visible,
}: CoverageLayerProps) {
  const imageUrl = useMemo(() => {
    return renderCoverageCanvas(result, nodeColor, rxSensitivityDbm);
  }, [result, nodeColor, rxSensitivityDbm]);

  if (!visible) return null;

  return (
    <ImageOverlay
      url={imageUrl}
      bounds={result.bounds}
      opacity={0.75}
      // IMPORTANT: zIndex keeps coverage below markers
      // Use the pane system for proper layering
    />
  );
}

function renderCoverageCanvas(
  result: CoverageResult,
  nodeColor: string,
  rxSensitivityDbm: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = result.cols;
  canvas.height = result.rows;
  const ctx = canvas.getContext('2d')!;

  const imageData = ctx.createImageData(result.cols, result.rows);
  const { r, g, b } = hexToRgb(nodeColor);
  const rangeDb = 40; // from rxSensitivity to rxSensitivity + 40

  for (let i = 0; i < result.grid.length; i++) {
    const signal = result.grid[i];
    const offset = i * 4;

    if (signal <= rxSensitivityDbm || !isFinite(signal)) {
      // No coverage — fully transparent
      imageData.data[offset + 3] = 0;
    } else {
      const strength = Math.min((signal - rxSensitivityDbm) / rangeDb, 1);
      const alpha = Math.round(40 + strength * 140); // 40–180 out of 255
      imageData.data[offset] = r;
      imageData.data[offset + 1] = g;
      imageData.data[offset + 2] = b;
      imageData.data[offset + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}
```

**Key rules for ImageOverlay:**
- The canvas dimensions match the coverage grid (cols × rows), NOT the screen pixels. Leaflet handles the scaling.
- Use `document.createElement('canvas')` — do NOT insert it into the DOM.
- Convert to data URL with `canvas.toDataURL()`. For very large grids, consider `canvas.toBlob()` + `URL.createObjectURL()`.
- The `bounds` must be a Leaflet `LatLngBounds` matching the geographic extent of the coverage grid.

## Custom map panes for layer ordering

Leaflet renders layers in pane order. To ensure coverage is always below markers:

```tsx
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

function CoveragePaneCreator() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane('coveragePane')) {
      const pane = map.createPane('coveragePane');
      pane.style.zIndex = '350'; // between tiles (200) and markers (600)
    }
  }, [map]);

  return null;
}
```

Then pass `pane="coveragePane"` on each ImageOverlay. Note: react-leaflet's `ImageOverlay` doesn't expose a `pane` prop directly — you'll need to use the `eventHandlers` or `ref` approach:

```tsx
const overlayRef = useRef<L.ImageOverlay>(null);

useEffect(() => {
  if (overlayRef.current) {
    // Move to the coverage pane after mount
    const element = overlayRef.current.getElement();
    if (element) {
      map.getPane('coveragePane')?.appendChild(element);
    }
  }
}, [imageUrl]);
```

## Invalidating map size on sidebar toggle

When the sidebar opens/closes, the map container resizes. Leaflet must be told to recalculate.

```tsx
function SidebarResizeHandler({ sidebarOpen }: { sidebarOpen: boolean }) {
  const map = useMap();

  useEffect(() => {
    // Small delay to allow CSS transition to complete
    const timeout = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 250);
    return () => clearTimeout(timeout);
  }, [map, sidebarOpen]);

  return null;
}
```

## Map overlay controls (legend, buttons)

For custom controls positioned on the map (signal legend, tile switcher), use Leaflet's `L.Control` via a portal or absolutely-positioned div outside the MapContainer that's visually overlaid.

The simpler approach for React: position a `<div>` absolutely over the map area using Tailwind, with `pointer-events-none` on the wrapper and `pointer-events-auto` on the interactive elements:

```tsx
{/* This sits as a sibling to MapContainer, absolutely positioned */}
<div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
  <div className="pointer-events-auto rounded-lg bg-[hsl(var(--map-overlay-bg))] backdrop-blur-sm border border-border p-3">
    {/* Legend content */}
  </div>
</div>
```

**This is the preferred approach for MeshSight** — it avoids the complexity of Leaflet's Control API and keeps everything in React.

## Dashed line between two nodes (link analysis)

```tsx
import { Polyline } from 'react-leaflet';

<Polyline
  positions={[
    [nodeA.lat, nodeA.lng],
    [nodeB.lat, nodeB.lng],
  ]}
  pathOptions={{
    color: 'hsl(220, 15%, 60%)',
    weight: 2,
    dashArray: '8 6',
    opacity: 0.7,
  }}
/>
```

## Common pitfalls

1. **`MapContainer` centre/zoom are initial only.** To programmatically change them, use `useMap().setView()` from a child component.
2. **Never conditionally render `MapContainer`.** Mount it once and keep it mounted. Toggle visibility of child layers instead.
3. **Leaflet icon default images are broken with bundlers.** We use DivIcon exclusively, so this isn't an issue — but never switch to `L.icon()` without fixing the default icon URL issue.
4. **`useMapEvents` must be inside `MapContainer`.** It will throw if used outside the Leaflet context.
5. **Do NOT use `L.imageOverlay` (lowercase).** Use the react-leaflet `<ImageOverlay>` component to stay within the React tree.
6. **Marker re-renders on every parent render** if `icon` or `eventHandlers` are created inline. Always `useMemo` both.
