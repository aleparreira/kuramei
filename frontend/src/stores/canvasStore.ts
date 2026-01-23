/**
 * Zustand store for canvas state management.
 *
 * Handles semantic zoom levels and navigation path for drill-down.
 */

import { create } from 'zustand';

export type ZoomLevel = 'L0' | 'L1' | 'L2' | 'L3';

export interface NavigationItem {
  id: string;
  name: string;
  level: string;
}

interface CanvasState {
  /** Current semantic zoom level (null = show all) */
  currentLevel: ZoomLevel | null;

  /** Breadcrumb path for drill-down navigation */
  navigationPath: NavigationItem[];

  /** Set the current zoom level and trigger graph reload */
  setLevel: (level: ZoomLevel | null) => void;

  /** Add a node to the navigation path (drill-down) */
  pushNavigation: (node: NavigationItem) => void;

  /** Navigate back to a specific point in the path */
  popToNavigation: (index: number) => void;

  /** Clear navigation path */
  clearNavigation: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  currentLevel: 'L1', // Default to L1 (Domain view) per epic spec
  navigationPath: [],

  setLevel: (level) => {
    set({ currentLevel: level });
  },

  pushNavigation: (node) => {
    set((state) => ({
      navigationPath: [...state.navigationPath, node],
    }));
  },

  popToNavigation: (index) => {
    set((state) => ({
      navigationPath: state.navigationPath.slice(0, index + 1),
    }));
  },

  clearNavigation: () => {
    set({ navigationPath: [] });
  },
}));
