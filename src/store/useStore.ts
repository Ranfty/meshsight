import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MeshNode, LoRaConfig } from '@/types';

interface AppState {
  nodes: MeshNode[];
  selectedNodeId: string | null;
  loraConfig: LoRaConfig;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  sidebarOpen: boolean;
  placeMode: boolean;
  linkAnalysisMode: boolean;
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
}

type Store = AppState & AppActions;

const initialState: AppState = {
  nodes: [],
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
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,

      addNode: (node) =>
        set((state) => ({ nodes: [...state.nodes, node] })),

      updateNode: (id, updates) =>
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),

      removeNode: (id) =>
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        })),

      selectNode: (id) => set({ selectedNodeId: id }),

      setLoraConfig: (config) =>
        set((state) => ({ loraConfig: { ...state.loraConfig, ...config } })),

      setMapCenter: (center) => set({ mapCenter: center }),

      setMapZoom: (zoom) => set({ mapZoom: zoom }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setPlaceMode: (active) => set({ placeMode: active }),

      setLinkAnalysisMode: (active) => set({ linkAnalysisMode: active }),
    }),
    {
      name: 'meshsight-store',
      // Only persist these keys; placeMode and linkAnalysisMode reset on reload
      partialize: (state) => ({
        nodes: state.nodes,
        loraConfig: state.loraConfig,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
