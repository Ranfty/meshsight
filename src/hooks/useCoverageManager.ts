import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useCoverageWorker } from './useCoverageWorker';
import type { MeshNode, LoRaConfig } from '@/types';

function makeFingerprint(node: MeshNode, lora: LoRaConfig, radiusKm: number): string {
  return [
    node.lat.toFixed(6),
    node.lng.toFixed(6),
    node.antennaHeightM,
    node.txPowerDbm,
    node.antennaGainDbi,
    lora.frequencyMhz,
    lora.rxSensitivityDbm,
    radiusKm,
  ].join(',');
}

/**
 * Orchestrates coverage Worker calculations.
 * Call once from a stable component (e.g. inside MapContainer).
 * Automatically schedules/cancels calculations as nodes or LoRa config change.
 */
export function useCoverageManager() {
  const nodes = useStore((s) => s.nodes);
  const loraConfig = useStore((s) => s.loraConfig);
  const coverageRadiusKm = useStore((s) => s.coverageRadiusKm);

  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const fingerprintsRef = useRef<Map<string, string>>(new Map());
  // Maps worker request ID → node ID
  const requestToNodeRef = useRef<Map<string, string>>(new Map());

  const { calculateCoverage } = useCoverageWorker({
    onProgress: (requestId, percent) => {
      const nodeId = requestToNodeRef.current.get(requestId);
      if (nodeId !== undefined) {
        useStore.getState().setCoverageProgress(nodeId, percent);
      }
    },
    onCoverageResult: (result) => {
      useStore.getState().setCoverageResult(result);
      useStore.getState().clearCoverageProgress(result.nodeId);
      for (const [reqId, nId] of requestToNodeRef.current) {
        if (nId === result.nodeId) {
          requestToNodeRef.current.delete(reqId);
          break;
        }
      }
    },
    onError: (requestId, message) => {
      console.error('[CoverageManager]', message);
      const nodeId = requestToNodeRef.current.get(requestId);
      if (nodeId !== undefined) {
        useStore.getState().clearCoverageProgress(nodeId);
        requestToNodeRef.current.delete(requestId);
      }
    },
  });

  const scheduleCalculation = useCallback(
    (node: MeshNode, lora: LoRaConfig, radiusKm: number, delayMs: number) => {
      const existing = timersRef.current.get(node.id);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        timersRef.current.delete(node.id);
        fingerprintsRef.current.set(node.id, makeFingerprint(node, lora, radiusKm));
        const requestId = calculateCoverage(node, lora, radiusKm);
        requestToNodeRef.current.set(requestId, node.id);
        useStore.getState().setCoverageProgress(node.id, 0);
      }, delayMs);

      timersRef.current.set(node.id, timer);
    },
    [calculateCoverage],
  );

  const prevNodesRef = useRef(nodes);
  const prevLoraRef = useRef(loraConfig);
  const prevRadiusRef = useRef(coverageRadiusKm);

  useEffect(() => {
    const prevNodes = prevNodesRef.current;
    prevNodesRef.current = nodes;
    prevLoraRef.current = loraConfig;
    prevRadiusRef.current = coverageRadiusKm;

    const prevNodeIds = new Set(prevNodes.map((n) => n.id));
    const currNodeIds = new Set(nodes.map((n) => n.id));

    // Cancel timers for removed nodes (store already cleared their results via removeNode)
    for (const prevNode of prevNodes) {
      if (!currNodeIds.has(prevNode.id)) {
        const timer = timersRef.current.get(prevNode.id);
        if (timer) clearTimeout(timer);
        timersRef.current.delete(prevNode.id);
        fingerprintsRef.current.delete(prevNode.id);
      }
    }

    // Schedule calculations for new or changed nodes
    for (const node of nodes) {
      const fp = makeFingerprint(node, loraConfig, coverageRadiusKm);
      if (fp !== fingerprintsRef.current.get(node.id)) {
        // New nodes feel more responsive with a shorter delay
        const isNew = !prevNodeIds.has(node.id);
        scheduleCalculation(node, loraConfig, coverageRadiusKm, isNew ? 100 : 300);
      }
    }
  }, [nodes, loraConfig, coverageRadiusKm, scheduleCalculation]);

  // Cleanup pending timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);
}
