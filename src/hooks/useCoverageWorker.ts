import { useEffect, useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type {
  WorkerRequest,
  WorkerResponse,
  CoverageResult,
  ElevationProfile,
  MeshNode,
  LoRaConfig,
} from '../types';

interface CoverageCallbacks {
  onProgress?: (nodeId: string, percent: number) => void;
  onCoverageResult?: (result: CoverageResult) => void;
  onProfileResult?: (result: ElevationProfile) => void;
  onError?: (message: string) => void;
}

export function useCoverageWorker(callbacks: CoverageCallbacks) {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const worker = new Worker(
      new URL('../engine/coverage.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      const cbs = callbacksRef.current;

      switch (msg.type) {
        case 'COVERAGE_PROGRESS':
          cbs.onProgress?.(msg.id, msg.percent);
          break;
        case 'COVERAGE_RESULT':
          cbs.onCoverageResult?.(msg.result);
          break;
        case 'PROFILE_RESULT':
          cbs.onProfileResult?.(msg.result);
          break;
        case 'ERROR':
          cbs.onError?.(msg.message);
          break;
      }
    };

    worker.onerror = (error) => {
      callbacksRef.current.onError?.(`Worker error: ${error.message}`);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const calculateCoverage = useCallback(
    (node: MeshNode, loraConfig: LoRaConfig, radiusKm = 5, azimuthSteps = 360) => {
      const id = nanoid();
      workerRef.current?.postMessage({
        type: 'CALCULATE_COVERAGE',
        id,
        node,
        loraConfig,
        radiusKm,
        azimuthSteps,
      } satisfies WorkerRequest);
      return id;
    },
    [],
  );

  const calculateProfile = useCallback(
    (
      from: { lat: number; lng: number },
      to: { lat: number; lng: number },
      txHeightM: number,
      rxHeightM: number,
      loraConfig: LoRaConfig,
    ) => {
      const id = nanoid();
      workerRef.current?.postMessage({
        type: 'CALCULATE_PROFILE',
        id,
        from,
        to,
        txHeightM,
        rxHeightM,
        loraConfig,
      } satisfies WorkerRequest);
      return id;
    },
    [],
  );

  const cancel = useCallback((id: string) => {
    workerRef.current?.postMessage({
      type: 'CANCEL',
      id,
    } satisfies WorkerRequest);
  }, []);

  return { calculateCoverage, calculateProfile, cancel };
}
