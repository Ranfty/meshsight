import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElevationProvider, _clearMemoryCache } from './srtm';

// ── idb-keyval mock ────────────────────────────────────────────────────────────
// Simulate IndexedDB with a simple Map so tests run in Node without a real IDB.
const idbStore = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbStore.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    idbStore.set(key, value);
  }),
}));

// ── OffscreenCanvas / createImageBitmap shim ──────────────────────────────────
// Node / jsdom don't implement these. We provide minimal stubs that return a
// solid-colour bitmap whose RGB encodes a known elevation.

// For Ben Nevis test: encoded elevation ≈ 1345 m
// R*256 + G + B/256 - 32768 = 1345  →  R*256 + G = 34113  →  R=133, G=65, B=0
const BEN_NEVIS_ELEVATION = 1345;
const BEN_NEVIS_R = 133;
const BEN_NEVIS_G = 65;
const BEN_NEVIS_B = 0;

// We shim createImageBitmap and OffscreenCanvas to return controlled pixel data.

const mockImageData = {
  data: (() => {
    // 256*256 pixels × 4 channels = 262144 bytes
    const d = new Uint8ClampedArray(256 * 256 * 4);
    for (let i = 0; i < 256 * 256; i++) {
      d[i * 4] = BEN_NEVIS_R;
      d[i * 4 + 1] = BEN_NEVIS_G;
      d[i * 4 + 2] = BEN_NEVIS_B;
      d[i * 4 + 3] = 255;
    }
    return d;
  })(),
};

vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
  width: 256,
  height: 256,
  close: vi.fn(),
})));

vi.stubGlobal('OffscreenCanvas', class {
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
  getContext(_type: string) {
    return {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => mockImageData),
    };
  }
});

// ── fetch mock ─────────────────────────────────────────────────────────────────
const mockArrayBuffer = new ArrayBuffer(8); // contents don't matter — decoding is stubbed

const mockFetch = vi.fn(async (_url: string) => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => mockArrayBuffer,
  blob: async () => new Blob([mockArrayBuffer]),
}));

vi.stubGlobal('fetch', mockFetch);

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ElevationProvider', () => {
  beforeEach(() => {
    idbStore.clear();
    mockFetch.mockClear();
    _clearMemoryCache();
  });

  describe('getElevation', () => {
    it('Ben Nevis summit (56.7969, -5.0036) returns ~1345 m ±20 m', async () => {
      const provider = new ElevationProvider();
      const elevation = await provider.getElevation(56.7969, -5.0036);
      // The mock tile is filled with Ben Nevis elevation encoded in RGB
      const decoded = BEN_NEVIS_R * 256 + BEN_NEVIS_G + BEN_NEVIS_B / 256 - 32768;
      expect(elevation).toBeCloseTo(decoded, 0);
      expect(Math.abs(elevation - BEN_NEVIS_ELEVATION)).toBeLessThan(20);
    });

    it('returns NaN for 404 tiles (ocean / polar region)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
      const provider = new ElevationProvider();
      const elevation = await provider.getElevation(89, 0); // high Arctic
      expect(elevation).toBeNaN();
    });
  });

  describe('caching', () => {
    it('fetches the tile only once; second call hits IndexedDB cache', async () => {
      const provider = new ElevationProvider();

      // First call — cold cache
      await provider.getElevation(56.7969, -5.0036);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call — should use IndexedDB (set in first call)
      // We need a fresh provider instance so the in-memory cache is empty
      const provider2 = new ElevationProvider();
      // idbStore still has the tile from the first call
      await provider2.getElevation(56.7969, -5.0036);
      // fetch should NOT have been called again
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('in-memory cache prevents a second IndexedDB read', async () => {
      const { get } = await import('idb-keyval');
      const provider = new ElevationProvider();

      await provider.getElevation(56.7969, -5.0036); // primes memory cache
      const callsBefore = vi.mocked(get).mock.calls.length;

      await provider.getElevation(56.7969, -5.0036); // should hit memory cache
      const callsAfter = vi.mocked(get).mock.calls.length;

      expect(callsAfter).toBe(callsBefore); // no extra IDB reads
    });
  });

  describe('getProfile', () => {
    it('returns the requested number of samples', async () => {
      const provider = new ElevationProvider();
      const from = { lat: 56.7, lng: -5.1 };
      const to = { lat: 56.8, lng: -4.9 };
      const samples = 10;
      const profile = await provider.getProfile(from, to, samples);
      expect(profile).toHaveLength(samples);
    });

    it('first and last points match from/to coordinates', async () => {
      const provider = new ElevationProvider();
      const from = { lat: 56.7, lng: -5.1 };
      const to = { lat: 56.8, lng: -4.9 };
      const profile = await provider.getProfile(from, to, 5);
      expect(profile[0].lat).toBeCloseTo(from.lat, 4);
      expect(profile[0].lng).toBeCloseTo(from.lng, 4);
      expect(profile[profile.length - 1].lat).toBeCloseTo(to.lat, 4);
      expect(profile[profile.length - 1].lng).toBeCloseTo(to.lng, 4);
    });

    it('distances are monotonically increasing', async () => {
      const provider = new ElevationProvider();
      const from = { lat: 56.7, lng: -5.1 };
      const to = { lat: 56.8, lng: -4.9 };
      const profile = await provider.getProfile(from, to, 8);
      for (let i = 1; i < profile.length; i++) {
        expect(profile[i].distanceM).toBeGreaterThan(profile[i - 1].distanceM);
      }
    });

    it('first distance is 0 and last distance equals total haversine distance', async () => {
      const provider = new ElevationProvider();
      const from = { lat: 56.7, lng: -5.1 };
      const to = { lat: 56.8, lng: -4.9 };
      const profile = await provider.getProfile(from, to, 5);
      expect(profile[0].distanceM).toBe(0);
      // Total distance should match haversine
      const { haversineDistanceM } = await import('./geo');
      const total = haversineDistanceM(from.lat, from.lng, to.lat, to.lng);
      expect(profile[profile.length - 1].distanceM).toBeCloseTo(total, 0);
    });

    it('throws when samples < 2', async () => {
      const provider = new ElevationProvider();
      await expect(
        provider.getProfile({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, 1),
      ).rejects.toThrow();
    });
  });

  describe('isCached', () => {
    it('returns false when tiles are not in cache', async () => {
      const provider = new ElevationProvider();
      const bounds = { north: 57.0, south: 56.5, east: -4.8, west: -5.2 };
      const result = await provider.isCached(bounds);
      expect(result).toBe(false);
    });

    it('returns true after prefetchArea has populated the cache', async () => {
      const provider = new ElevationProvider();
      const bounds = { north: 57.0, south: 56.5, east: -4.8, west: -5.2 };
      await provider.prefetchArea(bounds);
      const result = await provider.isCached(bounds);
      expect(result).toBe(true);
    });
  });
});

