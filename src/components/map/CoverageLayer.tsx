import L from 'leaflet';
import { ImageOverlay, useMap } from 'react-leaflet';
import { useEffect, useRef, useMemo } from 'react';
import type { CoverageResult } from '@/types';

// ── Hex colour → RGB components ─────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 34, g: 197, b: 94 }; // fallback green
}

// ── Canvas renderer ──────────────────────────────────────────────────────────
// Maps signal strength (dBm) to node colour with alpha ramping over a 40 dB range.

function renderCoverageCanvas(
  result: CoverageResult,
  nodeColor: string,
  rxSensitivityDbm: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = result.cols;
  canvas.height = result.rows;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(result.cols, result.rows);
  const { r, g, b } = hexToRgb(nodeColor);
  const rangeDb = 40; // 40 dB above sensitivity = full strength

  for (let i = 0; i < result.grid.length; i++) {
    const signal = result.grid[i];
    const offset = i * 4;
    if (signal <= rxSensitivityDbm || !isFinite(signal)) {
      // Below sensitivity or void — fully transparent
      imageData.data[offset + 3] = 0;
    } else {
      const strength = Math.min((signal - rxSensitivityDbm) / rangeDb, 1);
      const alpha = Math.round(40 + strength * 140); // 40 (edge) → 180 (excellent)
      imageData.data[offset] = r;
      imageData.data[offset + 1] = g;
      imageData.data[offset + 2] = b;
      imageData.data[offset + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

// ── Pane initialiser — call once inside MapContainer ────────────────────────

export function CoveragePaneInit() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane('coveragePane')) {
      const pane = map.createPane('coveragePane');
      pane.style.zIndex = '350'; // above tiles (200), below markers (600)
      pane.style.pointerEvents = 'none';
    }
  }, [map]);

  return null;
}

// ── Coverage overlay ─────────────────────────────────────────────────────────

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
  const overlayRef = useRef<L.ImageOverlay>(null);
  const map = useMap();

  const imageUrl = useMemo(
    () => renderCoverageCanvas(result, nodeColor, rxSensitivityDbm),
    [result, nodeColor, rxSensitivityDbm],
  );

  // Move the overlay element into the coverage pane and set up fade-in transition
  useEffect(() => {
    if (!overlayRef.current) return;
    const element = overlayRef.current.getElement();
    const pane = map.getPane('coveragePane');
    if (!element || !pane) return;

    element.style.transition = 'opacity 300ms ease';
    if (element.parentNode !== pane) {
      pane.appendChild(element);
    }
  }, [imageUrl, map]);

  if (!visible) return null;

  return (
    <ImageOverlay
      ref={overlayRef}
      url={imageUrl}
      bounds={[
        [result.bounds.south, result.bounds.west],
        [result.bounds.north, result.bounds.east],
      ]}
      opacity={0.75}
    />
  );
}
