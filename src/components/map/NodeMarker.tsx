import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import { useMemo, useRef } from 'react';
import type { MeshNode } from '@/types';

interface NodeMarkerProps {
  node: MeshNode;
  isSelected: boolean;
  isCalculating: boolean;
  progress: number; // 0–100
  onSelect: (id: string) => void;
  onDragEnd: (id: string, latlng: L.LatLng) => void;
}

export default function NodeMarker({
  node,
  isSelected,
  isCalculating,
  progress,
  onSelect,
  onDragEnd,
}: NodeMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  const icon = useMemo(() => {
    const size = isSelected ? 28 : 22;
    const border = isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.5)';
    const pulseStyle = isCalculating
      ? 'animation: leaflet-marker-pulse 1.5s ease-in-out infinite;'
      : '';
    const progressBadge =
      isCalculating && progress > 0
        ? `<div style="
            position: absolute;
            bottom: -17px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 500;
            color: rgba(255,255,255,0.85);
            white-space: nowrap;
            background: rgba(0,0,0,0.5);
            padding: 1px 4px;
            border-radius: 2px;
            line-height: 1.4;
          ">${progress}%</div>`
        : '';

    return L.divIcon({
      className: '',
      html: `<div style="position: relative; width: ${size}px; height: ${size}px; overflow: visible;">
        <div style="
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
          ${pulseStyle}
        ">${node.name.charAt(0)}</div>
        ${progressBadge}
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, [node.color, node.name, isSelected, isCalculating, progress]);

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
    [node.id, onSelect, onDragEnd],
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
