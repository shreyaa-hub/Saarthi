import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { useState } from "react";
import type { CanvasElement, TemplateCanvas, PageStyle } from "@/lib/types/canvas";

type Snapshot = {
  elements: CanvasElement[];
  background: string;
  width: number;
  height: number;
  pageStyle: PageStyle;
};

const HISTORY_LIMIT = 50;
const CHECKPOINT_DEBOUNCE_MS = 500;

export type CanvasState = {
  width: number;
  height: number;
  background: string;
  pageStyle: PageStyle;
  elements: CanvasElement[];
  selectedIds: string[];
  dirty: boolean;
  past: Snapshot[];
  future: Snapshot[];
};

export type CanvasActions = {
  addElement: (el: CanvasElement) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  removeSelected: () => void;
  select: (id: string | null, opts?: { additive?: boolean }) => void;
  selectMany: (ids: string[]) => void;
  duplicateElement: (id: string) => void;
  duplicateSelected: () => void;
  reorder: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  setBackground: (color: string) => void;
  setSize: (width: number, height: number) => void;
  setPageStyle: (pageStyle: PageStyle) => void;
  markSaved: () => void;
  toCanvas: () => TemplateCanvas;
  undo: () => void;
  redo: () => void;
};

export type CanvasStore = CanvasState & CanvasActions;

function snapshotOf(s: CanvasState): Snapshot {
  return { elements: s.elements, background: s.background, width: s.width, height: s.height, pageStyle: s.pageStyle };
}

export function createCanvasStore(initial: TemplateCanvas) {
  // Plain closure var (not store state) — throttles how often a mutation
  // opens a new undo step, so a drag or a burst of keystrokes collapses
  // into one history entry instead of one per pointermove/keydown.
  let lastCheckpointAt = 0;

  const store = createStore<CanvasStore>()((set, get) => {
    const checkpoint = (force = false) => {
      const now = Date.now();
      if (!force && now - lastCheckpointAt < CHECKPOINT_DEBOUNCE_MS) return;
      lastCheckpointAt = now;
      set((s) => ({ past: [...s.past, snapshotOf(s)].slice(-HISTORY_LIMIT), future: [] }));
    };

    return {
      width: initial.width,
      height: initial.height,
      background: initial.background,
      pageStyle: initial.pageStyle ?? "blank",
      elements: initial.elements,
      selectedIds: [],
      dirty: false,
      past: [],
      future: [],

      addElement: (el) => {
        checkpoint(true);
        set((s) => ({ elements: [...s.elements, el], selectedIds: [el.id], dirty: true }));
      },

      updateElement: (id, patch) => {
        checkpoint();
        set((s) => {
          const el = s.elements.find((e) => e.id === id);
          if (!el) return s;

          const isPureMove =
            typeof patch.x === "number" &&
            typeof patch.y === "number" &&
            Object.keys(patch).every((k) => k === "x" || k === "y");
          const isGroupMove = isPureMove && s.selectedIds.length > 1 && s.selectedIds.includes(id);

          if (!isGroupMove) {
            return {
              elements: s.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as CanvasElement) : e)),
              dirty: true,
            };
          }

          const dx = (patch.x as number) - el.x;
          const dy = (patch.y as number) - el.y;
          return {
            elements: s.elements.map((e) =>
              s.selectedIds.includes(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e,
            ),
            dirty: true,
          };
        });
      },

      removeElement: (id) => {
        checkpoint(true);
        set((s) => ({
          elements: s.elements.filter((e) => e.id !== id),
          selectedIds: s.selectedIds.filter((sid) => sid !== id),
          dirty: true,
        }));
      },

      removeSelected: () => {
        checkpoint(true);
        set((s) => ({
          elements: s.elements.filter((e) => !s.selectedIds.includes(e.id)),
          selectedIds: [],
          dirty: true,
        }));
      },

      select: (id, opts) =>
        set((s) => {
          if (id === null) return { selectedIds: [] };
          if (opts?.additive) {
            return s.selectedIds.includes(id)
              ? { selectedIds: s.selectedIds.filter((sid) => sid !== id) }
              : { selectedIds: [...s.selectedIds, id] };
          }
          return { selectedIds: [id] };
        }),

      selectMany: (ids) => set({ selectedIds: ids }),

      duplicateElement: (id) => {
        checkpoint(true);
        set((s) => {
          const el = s.elements.find((e) => e.id === id);
          if (!el) return s;
          const copy = {
            ...el,
            id: `${el.id}-${Math.random().toString(36).slice(2, 7)}`,
            x: el.x + 20,
            y: el.y + 20,
          };
          return { elements: [...s.elements, copy], selectedIds: [copy.id], dirty: true };
        });
      },

      duplicateSelected: () => {
        checkpoint(true);
        set((s) => {
          const copies = s.elements
            .filter((e) => s.selectedIds.includes(e.id))
            .map((el) => ({
              ...el,
              id: `${el.id}-${Math.random().toString(36).slice(2, 7)}`,
              x: el.x + 20,
              y: el.y + 20,
            }));
          return {
            elements: [...s.elements, ...copies],
            selectedIds: copies.map((c) => c.id),
            dirty: true,
          };
        });
      },

      reorder: (id, direction) => {
        checkpoint(true);
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
        });
      },

      setBackground: (color) => {
        checkpoint();
        set({ background: color, dirty: true });
      },
      setSize: (width, height) => {
        checkpoint();
        set({ width, height, dirty: true });
      },
      setPageStyle: (pageStyle) => {
        checkpoint();
        set({ pageStyle, dirty: true });
      },
      markSaved: () => set({ dirty: false }),
      toCanvas: () => {
        const s = get();
        return { width: s.width, height: s.height, background: s.background, pageStyle: s.pageStyle, elements: s.elements };
      },

      undo: () =>
        set((s) => {
          if (s.past.length === 0) return s;
          const previous = s.past[s.past.length - 1];
          const rest = s.past.slice(0, -1);
          return {
            ...previous,
            past: rest,
            future: [snapshotOf(s), ...s.future].slice(0, HISTORY_LIMIT),
            selectedIds: [],
            dirty: true,
          };
        }),

      redo: () =>
        set((s) => {
          if (s.future.length === 0) return s;
          const [next, ...rest] = s.future;
          return {
            ...next,
            past: [...s.past, snapshotOf(s)].slice(-HISTORY_LIMIT),
            future: rest,
            selectedIds: [],
            dirty: true,
          };
        }),
    };
  });

  return store;
}

export type CanvasStoreApi = ReturnType<typeof createCanvasStore>;

export function useCanvasStoreInstance(initial: TemplateCanvas) {
  const [store] = useState(() => createCanvasStore(initial));
  return store;
}

export function useCanvasStore<T>(store: CanvasStoreApi, selector: (state: CanvasStore) => T): T {
  return useStore(store, selector);
}
