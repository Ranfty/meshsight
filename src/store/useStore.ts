import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MeshNode, LoRaConfig, CoverageResult } from '@/types';

interface AppState {
  nodes: MeshNode[];
  nextNodeIndex: number;           // monotonically incrementing — survives deletions
  selectedNodeId: string | null;
  loraConfig: LoRaConfig;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  sidebarOpen: boolean;
  placeMode: boolean;
  linkAnalysisMode: boolean;
  flyTarget: { lat: number; lng: number; zoom?: number } | null;
  // Coverage state (not persisted)
  coverageResults: Record<string, CoverageResult>; // nodeId → result
  coverageProgress: Record<string, number>;         // nodeId → 0-100 while calculating
  // Visibility (persisted)
  nodeVisibility: Record<string, boolean>;          // nodeId → false = hidden
}

interface AppActions {
  addNode: (node: MeshNode) => void;
  updateNode: (id: string, updates: Partial<MeshNode>) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setLoraConfig: (config: Partial<LoRaConfig>) => void;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setPlaceMode: (active: boolean) => void;
  setLinkAnalysisMode: (active: boolean) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  clearFlyTarget: () => void;
  setCoverageResult: (result: CoverageResult) => void;
  setCoverageProgress: (nodeId: string, percent: number) => void;
  clearCoverageProgress: (nodeId: string) => void;
  setNodeVisibility: (nodeId: string, visible: boolean) => void;
}

interface Store extends AppState, AppActions {}

const initialState: AppState = {
  nodes: [],
  nextNodeIndex: 0,
  selectedNodeId: null,
  loraConfig: {
    frequencyMhz: 868.0,
    bandwidthKhz: 250,
    spreadingFactor: 11,
    codingRate: 5,
    rxSensitivityDbm: -123,
    preset: 'LONG_FAST',
  },
  mapCenter: { lat: 52.5, lng: -1.5 },
  mapZoom: 7,
  sidebarOpen: true,
  placeMode: false,
  linkAnalysisMode: false,
  flyTarget: null,
  coverageResults: {},
  coverageProgress: {},
  nodeVisibility: {},
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,

      addNode: (node) =>
        set((state) => ({
          nodes: [...state.nodes, node],
          nextNodeIndex: state.nextNodeIndex + 1,
        })),

      updateNode: (id, updates) =>
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),

      removeNode: (id) =>
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _cr, ...restCoverage } = state.coverageResults;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _cp, ...restProgress } = state.coverageProgress;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _cv, ...restVisibility } = state.nodeVisibility;
          return {
            nodes: state.nodes.filter((n) => n.id !== id),
            selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
            coverageResults: restCoverage,
            coverageProgress: restProgress,
            nodeVisibility: restVisibility,
          };
        }),

      selectNode: (id) => set({ selectedNodeId: id }),

      setLoraConfig: (config) =>
        set((state) => ({ loraConfig: { ...state.loraConfig, ...config } })),

      setMapCenter: (center) => set({ mapCenter: center }),

      setMapZoom: (zoom) => set({ mapZoom: zoom }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setPlaceMode: (active) => set({ placeMode: active }),

      setLinkAnalysisMode: (active) => set({ linkAnalysisMode: active }),

      flyTo: (lat, lng, zoom) => set({ flyTarget: { lat, lng, zoom } }),

      clearFlyTarget: () => set({ flyTarget: null }),

      setCoverageResult: (result) =>
        set((state) => ({
          coverageResults: { ...state.coverageResults, [result.nodeId]: result },
        })),

      setCoverageProgress: (nodeId, percent) =>
        set((state) => ({
          coverageProgress: { ...state.coverageProgress, [nodeId]: percent },
        })),

      clearCoverageProgress: (nodeId) =>
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [nodeId]: _, ...rest } = state.coverageProgress;
          return { coverageProgress: rest };
        }),

      setNodeVisibility: (nodeId, visible) =>
        set((state) => ({
          nodeVisibility: { ...state.nodeVisibility, [nodeId]: visible },
        })),
    }),
    {
      name: 'meshsight-store',
      // Only persist these keys; transient state resets on reload
      partialize: (state) => ({
        nodes: state.nodes,
        nextNodeIndex: state.nextNodeIndex,
        loraConfig: state.loraConfig,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
        sidebarOpen: state.sidebarOpen,
        nodeVisibility: state.nodeVisibility,
      }),
    }
  )
);
