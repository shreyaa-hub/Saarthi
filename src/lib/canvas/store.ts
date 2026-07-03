import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { useState } from "react";
import type { CanvasElement, TemplateCanvas } from "@/lib/types/canvas";

export type CanvasState = {
  width: number;
  height: number;
  background: string;
  elements: CanvasElement[];
  selectedId: string | null;
  dirty: boolean;
};

export type CanvasActions = {
  addElement: (el: CanvasElement) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  select: (id: string | null) => void;
  duplicateElement: (id: string) => void;
  reorder: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  setBackground: (color: string) => void;
  setSize: (width: number, height: number) => void;
  markSaved: () => void;
  toCanvas: () => TemplateCanvas;
};

export type CanvasStore = CanvasState & CanvasActions;

export function createCanvasStore(initial: TemplateCanvas) {
  return createStore<CanvasStore>()((set, get) => ({
    width: initial.width,
    height: initial.height,
    background: initial.background,
    elements: initial.elements,
    selectedId: null,
    dirty: false,

    addElement: (el) =>
      set((s) => ({ elements: [...s.elements, el], selectedId: el.id, dirty: true })),

    updateElement: (id, patch) =>
      set((s) => ({
        elements: s.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as CanvasElement) : e)),
        dirty: true,
      })),

    removeElement: (id) =>
      set((s) => ({
        elements: s.elements.filter((e) => e.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        dirty: true,
      })),

    select: (id) => set({ selectedId: id }),

    duplicateElement: (id) =>
      set((s) => {
        const el = s.elements.find((e) => e.id === id);
        if (!el) return s;
        const copy = { ...el, id: `${el.id}-${Math.random().toString(36).slice(2, 7)}`, x: el.x + 20, y: el.y + 20 };
        return { elements: [...s.elements, copy], selectedId: copy.id, dirty: true };
      }),

    reorder: (id, direction) =>
      set((s) => {
        const idx = s.elements.findIndex((e) => e.id === id);
        if (idx === -1) return s;
        const arr = [...s.elements];
        const [item] = arr.splice(idx, 1);
        if (direction === "front") arr.push(item);
        else if (direction === "back") arr.unshift(item);
        else if (direction === "forward") arr.splice(Math.min(idx + 1, arr.length), 0, item);
        else arr.splice(Math.max(idx - 1, 0), 0, item);
        return { elements: arr, dirty: true };
      }),

    setBackground: (color) => set({ background: color, dirty: true }),
    setSize: (width, height) => set({ width, height, dirty: true }),
    markSaved: () => set({ dirty: false }),
    toCanvas: () => {
      const s = get();
      return { width: s.width, height: s.height, background: s.background, elements: s.elements };
    },
  }));
}

export type CanvasStoreApi = ReturnType<typeof createCanvasStore>;

export function useCanvasStoreInstance(initial: TemplateCanvas) {
  const [store] = useState(() => createCanvasStore(initial));
  return store;
}

export function useCanvasStore<T>(store: CanvasStoreApi, selector: (state: CanvasStore) => T): T {
  return useStore(store, selector);
}
