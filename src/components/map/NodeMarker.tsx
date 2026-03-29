import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import { useMemo, useRef } from 'react';
import type { MeshNode } from '@/types';

interface NodeMarkerProps {
  node: MeshNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, latlng: L.LatLng) => void;
}

export default function NodeMarker({ node, isSelected, onSelect, onDragEnd }: NodeMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  const icon = useMemo(() => {
    const size = isSelected ? 28 : 22;
    const border = isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.5)';
    return L.divIcon({
      className: '',
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
        color: var(--primary-foreground);
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
