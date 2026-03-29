# Web Worker Patterns for MeshSight

Reference for typed Web Workers with Vite and TypeScript. All heavy computation in MeshSight (elevation lookups, LOS checks, coverage sweeps) runs in a Web Worker. Follow these patterns exactly.

## Vite configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',   // REQUIRED: enables ESM imports inside Worker files
  },
});
```

## Worker instantiation (standard way)

Use the `new URL()` + `new Worker()` pattern. This is the Vite-recommended approach and works in both dev and production builds.

```ts
// src/hooks/useCoverageWorker.ts
const worker = new Worker(
  new URL('../engine/coverage.worker.ts', import.meta.url),
  { type: 'module' }   // REQUIRED for ESM imports in the Worker
);
```

**Do NOT use the `?worker` import suffix.** The `new URL()` pattern is the standard, works with TypeScript, and is what Vite recommends going forward.

## Shared types between main thread and Worker

All message types live in `src/types/index.ts`. Both the main thread and the Worker import from this file. This is safe because Vite bundles the Worker separately and tree-shakes the types.

```ts
// src/types/index.ts

// ── Messages: Main → Worker ──────────────────────────────────
export type WorkerRequest =
  | {
      type: 'CALCULATE_COVERAGE';
      id: string;                    // request ID for correlation
      node: MeshNode;
      loraConfig: LoRaConfig;
      radiusKm: number;
      azimuthSteps: number;
    }
  | {
      type: 'CALCULATE_PROFILE';
      id: string;
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      txHeightM: number;
      rxHeightM: number;
      loraConfig: LoRaConfig;
    }
  | {
      type: 'CANCEL';
      id: string;
    };

// ── Messages: Worker → Main ──────────────────────────────────
export type WorkerResponse =
  | {
      type: 'COVERAGE_PROGRESS';
      id: string;
      percent: number;               // 0–100
    }
  | {
      type: 'COVERAGE_RESULT';
      id: string;
      result: CoverageResult;
    }
  | {
      type: 'PROFILE_RESULT';
      id: string;
      result: ElevationProfile;
    }
  | {
      type: 'ERROR';
      id: string;
      message: string;
    };
```

## Worker file template

```ts
// src/engine/coverage.worker.ts
/// <reference lib="webworker" />

// This directive gives TypeScript the correct global types (self, postMessage, etc.)
// without conflicting with DOM types.

import type { WorkerRequest, WorkerResponse } from '../types';
import { ElevationProvider } from './srtm';
import { checkLOS } from './los';
import { calculateLinkBudget } from './linkbudget';

// Module-level state (persists across messages)
const elevationProvider = new ElevationProvider();

// ── Type-safe message handler ────────────────────────────────
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    switch (request.type) {
      case 'CALCULATE_COVERAGE':
        await handleCoverage(request);
        break;

      case 'CALCULATE_PROFILE':
        await handleProfile(request);
        break;

      case 'CANCEL':
        // Set a cancellation flag checked by long-running loops
        cancelledRequests.add(request.id);
        break;
    }
  } catch (error) {
    respond({
      type: 'ERROR',
      id: request.id,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ── Type-safe postMessage wrapper ────────────────────────────
function respond(message: WorkerResponse, transfer?: Transferable[]) {
  if (transfer) {
    self.postMessage(message, transfer);
  } else {
    self.postMessage(message);
  }
}

// ── Cancellation tracking ────────────────────────────────────
const cancelledRequests = new Set<string>();

function isCancelled(id: string): boolean {
  if (cancelledRequests.has(id)) {
    cancelledRequests.delete(id);
    return true;
  }
  return false;
}

// ── Handlers ─────────────────────────────────────────────────
async function handleCoverage(request: Extract<WorkerRequest, { type: 'CALCULATE_COVERAGE' }>) {
  const { id, node, loraConfig, radiusKm, azimuthSteps } = request;

  // 1. Prefetch elevation tiles for the coverage area
  // ... (implementation)

  // 2. Radial sweep
  for (let az = 0; az < azimuthSteps; az++) {
    if (isCancelled(id)) return;

    // ... sweep logic per azimuth ...

    // Report progress every 10%
    if (az % Math.ceil(azimuthSteps / 10) === 0) {
      respond({
        type: 'COVERAGE_PROGRESS',
        id,
        percent: Math.round((az / azimuthSteps) * 100),
      });
    }
  }

  // 3. Return result with Transferable
  const grid = new Float32Array(/* ... */);

  respond(
    {
      type: 'COVERAGE_RESULT',
      id,
      result: {
        nodeId: node.id,
        grid,
        bounds: { /* ... */ },
        resolution: 90,
        cols: /* ... */,
        rows: /* ... */,
      },
    },
    [grid.buffer]   // Transfer the ArrayBuffer — zero-copy
  );
}

async function handleProfile(request: Extract<WorkerRequest, { type: 'CALCULATE_PROFILE' }>) {
  // ... implementation
}

// REQUIRED: makes TypeScript treat this as a module, not a script
export {};
```

**Key rules for the Worker file:**
- Start with `/// <reference lib="webworker" />`
- End with `export {};` (makes it a module for TypeScript)
- Use `self.onmessage`, not `addEventListener('message', ...)`
- Never import React, DOM APIs, or anything from `src/components/`
- The `ElevationProvider` class (srtm.ts) works inside Workers because IndexedDB is available in Worker scope

## React hook for Worker communication

```ts
// src/hooks/useCoverageWorker.ts
import { useEffect, useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { WorkerRequest, WorkerResponse, CoverageResult, ElevationProfile } from '../types';

interface CoverageCallbacks {
  onProgress?: (nodeId: string, percent: number) => void;
  onCoverageResult?: (result: CoverageResult) => void;
  onProfileResult?: (result: ElevationProfile) => void;
  onError?: (message: string) => void;
}

export function useCoverageWorker(callbacks: CoverageCallbacks) {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks; // always latest callbacks without re-creating Worker

  // ── Create and tear down the Worker ──────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('../engine/coverage.worker.ts', import.meta.url),
      { type: 'module' }
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
      worker.terminate();   // IMPORTANT: always terminate on unmount
      workerRef.current = null;
    };
  }, []); // Empty deps — Worker lives for the component's lifetime

  // ── Typed request senders ────────────────────────────────
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
    []
  );

  const calculateProfile = useCallback(
    (from: LatLng, to: LatLng, txHeightM: number, rxHeightM: number, loraConfig: LoRaConfig) => {
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
    []
  );

  const cancel = useCallback((id: string) => {
    workerRef.current?.postMessage({
      type: 'CANCEL',
      id,
    } satisfies WorkerRequest);
  }, []);

  return { calculateCoverage, calculateProfile, cancel };
}
```

## Transferable objects

When the Worker returns a `Float32Array` (the coverage grid), we transfer its underlying `ArrayBuffer` to avoid copying potentially large buffers.

```ts
// In the Worker:
const grid = new Float32Array(cols * rows);
// ... fill grid ...

respond(
  { type: 'COVERAGE_RESULT', id, result: { /* ... */ grid } },
  [grid.buffer]   // second arg: array of Transferable objects
);

// IMPORTANT: After transfer, `grid` is neutered in the Worker (length becomes 0).
// Do NOT read from `grid` after postMessage with transfer.
```

On the main thread side, the `Float32Array` arrives as a normal property — no special handling needed.

## IndexedDB access from Workers

`idb-keyval` works in Workers (IndexedDB is available in Worker scope). No special configuration needed.

```ts
// src/engine/srtm.ts — works identically in main thread and Worker
import { get, set } from 'idb-keyval';

export class ElevationProvider {
  private async getCachedTile(key: string): Promise<ArrayBuffer | undefined> {
    return get<ArrayBuffer>(key);
  }

  private async cacheTile(key: string, data: ArrayBuffer): Promise<void> {
    await set(key, data);
  }

  // fetch() is also available in Workers
  private async fetchTile(z: number, x: number, y: number): Promise<ArrayBuffer> {
    const key = `terrarium-${z}-${x}-${y}`;
    const cached = await this.getCachedTile(key);
    if (cached) return cached;

    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    const response = await fetch(url);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    await this.cacheTile(key, buffer);
    return buffer;
  }
}
```

## Decoding images in Workers

Workers don't have access to `document.createElement('canvas')` or `Image()`. To decode the Terrarium PNG tiles in the Worker, use `createImageBitmap()` + `OffscreenCanvas`:

```ts
async function decodeTerrariumPng(buffer: ArrayBuffer): Promise<Float32Array> {
  const blob = new Blob([buffer], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const elevations = new Float32Array(canvas.width * canvas.height);

  for (let i = 0; i < elevations.length; i++) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    elevations[i] = (r * 256 + g + b / 256) - 32768;
  }

  return elevations;
}
```

**Key point:** `OffscreenCanvas` and `createImageBitmap` are available in Workers. `HTMLCanvasElement` and `Image()` are NOT.

## Testing Workers with Vitest

Install `@vitest/web-worker` as a dev dependency and add it to `setupFiles`:

```ts
// vitest.config.ts (or inline in vite.config.ts)
export default defineConfig({
  test: {
    setupFiles: ['@vitest/web-worker'],
  },
});
```

Then tests can instantiate Workers normally:

```ts
// src/engine/coverage.worker.test.ts
import { describe, it, expect } from 'vitest';
import '@vitest/web-worker';

describe('Coverage Worker', () => {
  it('calculates coverage and returns a grid', async () => {
    const worker = new Worker(
      new URL('./coverage.worker.ts', import.meta.url),
      { type: 'module' }
    );

    const result = await new Promise<CoverageResult>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'COVERAGE_RESULT') resolve(e.data.result);
        if (e.data.type === 'ERROR') reject(new Error(e.data.message));
      };

      worker.postMessage({
        type: 'CALCULATE_COVERAGE',
        id: 'test-1',
        node: { /* test node */ },
        loraConfig: { /* LONG_FAST preset */ },
        radiusKm: 1,
        azimuthSteps: 36,
      } satisfies WorkerRequest);
    });

    expect(result.grid).toBeInstanceOf(Float32Array);
    expect(result.cols).toBeGreaterThan(0);
    expect(result.rows).toBeGreaterThan(0);

    worker.terminate();
  });
});
```

**Note:** `@vitest/web-worker` runs Workers in the same thread (simulated), so Transferable semantics differ slightly — the buffer isn't actually neutered. Tests should not depend on buffer neutering behaviour.

## Common pitfalls

1. **Missing `{ type: 'module' }` on `new Worker()`.** Without this, ESM imports inside the Worker will fail with "Cannot use import statement outside a module".
2. **Forgetting `export {};` at the end of the Worker file.** TypeScript needs this to treat it as a module.
3. **Reading a transferred buffer after postMessage.** The buffer is neutered (zeroed) in the sender. Copy first if you need to keep it.
4. **Creating `Image()` or `HTMLCanvasElement` in a Worker.** Use `createImageBitmap()` + `OffscreenCanvas` instead.
5. **Not terminating Workers on unmount.** Always call `worker.terminate()` in the useEffect cleanup.
6. **Blocking the Worker's event loop.** Long synchronous loops prevent the Worker from receiving CANCEL messages. Periodically yield with `await new Promise(r => setTimeout(r, 0))` in very long loops if cancellation responsiveness matters.
