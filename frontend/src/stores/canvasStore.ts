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

  /** Current parent node ID for drill-down filtering (null = show root nodes) */
  currentParentId: string | null;

  /** Set the current zoom level and trigger graph reload */
  setLevel: (level: ZoomLevel | null) => void;

  /** Add a node to the navigation path (drill-down) */
  pushNavigation: (node: NavigationItem) => void;

  /** Navigate back to a specific point in the path */
  popToNavigation: (index: number) => void;

  /** Clear navigation path and go back to root */
  clearNavigation: () => void;

  /** Get the current parent ID from navigation path (last item or null) */
  getCurrentParentId: () => string | null;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  currentLevel: 'L1', // Default to L1 (Domain view) per epic spec
  navigationPath: [],
  currentParentId: null,

  setLevel: (level) => {
    set({ currentLevel: level });
  },

  pushNavigation: (node) => {
    set((state) => ({
      navigationPath: [...state.navigationPath, node],
      currentParentId: node.id,
    }));
  },

  popToNavigation: (index) => {
    set((state) => {
      const newPath = state.navigationPath.slice(0, index + 1);
      return {
        navigationPath: newPath,
        currentParentId: newPath.length > 0 ? newPath[newPath.length - 1].id : null,
      };
    });
  },

  clearNavigation: () => {
    set({ navigationPath: [], currentParentId: null });
  },

  getCurrentParentId: () => {
    const state = get();
    return state.currentParentId;
  },
}));
