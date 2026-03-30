import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useCoverageWorker } from './useCoverageWorker';

/**
 * Orchestrates link profile calculations.
 * Call once from a stable component (e.g. inside MapContainer).
 * Automatically recalculates when link endpoints, node positions, or LoRa config change.
 */
export function useLinkProfileManager() {
  const linkEndpoints = useStore((s) => s.linkEndpoints);
  const nodes = useStore((s) => s.nodes);
  const loraConfig = useStore((s) => s.loraConfig);

  const prevFingerprintRef = useRef<string | null>(null);
  const prevEndpointsRef = useRef<string | null>(null);
  const autoNavigateRef = useRef(false);

  const { calculateProfile } = useCoverageWorker({
    onProfileResult: (result) => {
      useStore.getState().setLinkProfile(result);
      useStore.getState().setLinkProfileCalculating(false);
      // Only auto-navigate to the link tab when new endpoints were selected
      if (autoNavigateRef.current) {
        useStore.getState().setActiveTab('link');
        autoNavigateRef.current = false;
      }
    },
    onError: (_id, message) => {
      console.error('[LinkProfile]', message);
      useStore.getState().setLinkProfileCalculating(false);
    },
  });

  useEffect(() => {
    const [txId, rxId] = linkEndpoints;

    if (!txId || !rxId) {
      prevFingerprintRef.current = null;
      prevEndpointsRef.current = null;
      return;
    }

    const txNode = nodes.find((n) => n.id === txId);
    const rxNode = nodes.find((n) => n.id === rxId);
    if (!txNode || !rxNode) return;

    const endpointKey = `${txId},${rxId}`;
    const endpointsChanged = endpointKey !== prevEndpointsRef.current;
    prevEndpointsRef.current = endpointKey;

    const fp = [
      txNode.lat.toFixed(6),
      txNode.lng.toFixed(6),
      txNode.antennaHeightM,
      rxNode.lat.toFixed(6),
      rxNode.lng.toFixed(6),
      rxNode.antennaHeightM,
      loraConfig.frequencyMhz,
      loraConfig.rxSensitivityDbm,
    ].join(',');

    if (fp === prevFingerprintRef.current) return;
    prevFingerprintRef.current = fp;

    if (endpointsChanged) {
      autoNavigateRef.current = true;
    }

    useStore.getState().setLinkProfileCalculating(true);
    calculateProfile(
      { lat: txNode.lat, lng: txNode.lng },
      { lat: rxNode.lat, lng: rxNode.lng },
      txNode.antennaHeightM,
      rxNode.antennaHeightM,
      loraConfig,
    );
  }, [linkEndpoints, nodes, loraConfig, calculateProfile]);
}
