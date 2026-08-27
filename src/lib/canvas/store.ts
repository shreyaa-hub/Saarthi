import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { useState } from "react";
import { nanoid } from "nanoid";
import type { CanvasElement, TemplateCanvas, PageStyle, CanvasPage } from "@/lib/types/canvas";
import { allPages } from "@/lib/types/canvas";

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
  // Every page of the document. `elements`/`pageStyle` above mirror
  // pages[pageIndex] — they are the live copy being edited, and are folded
  // back into `pages` whenever the page changes or the canvas is serialised.
  // Keeping the live page at the top level is what lets addElement,
  // updateElement, undo, snapping and every other existing action stay
  // exactly as they were.
  pages: CanvasPage[];
  pageIndex: number;
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
  goToPage: (index: number) => void;
  addPage: () => void;
  removePage: (index: number) => void;
  markSaved: () => void;
  toCanvas: () => TemplateCanvas;
  undo: () => void;
  redo: () => void;
  beginGesture: () => void;
  endGesture: () => void;
};

export type CanvasStore = CanvasState & CanvasActions;

// Folds the live page back into the pages array. Called before anything that
// reads or replaces the page set, so the page being edited is never stale.
function syncCurrentPage(s: CanvasState): CanvasPage[] {
  return s.pages.map((p, i) =>
    i === s.pageIndex ? { ...p, elements: s.elements, pageStyle: s.pageStyle } : p,
  );
}

function snapshotOf(s: CanvasState): Snapshot {
  return { elements: s.elements, background: s.background, width: s.width, height: s.height, pageStyle: s.pageStyle };
}

export function createCanvasStore(initial: TemplateCanvas) {
  // Plain closure var (not store state) — throttles how often a mutation
  // opens a new undo step, so a drag or a burst of keystrokes collapses
  // into one history entry instead of one per pointermove/keydown.
  let lastCheckpointAt = 0;
  // True between pointerdown and pointerup of a direct-manipulation gesture
  // (dragging or resizing an element). The time-based debounce alone cannot
  // express "this is one gesture": a drag held for longer than the debounce
  // window split into several undo steps, so reversing one drag took several
  // Ctrl+Zs and left the element somewhere it had never been put. A gesture
  // takes its checkpoint once at the start and suppresses the rest.
  let inGesture = false;

  const store = createStore<CanvasStore>()((set, get) => {
    const checkpoint = (force = false) => {
      if (inGesture && !force) return;
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
      pages: allPages(initial),
      pageIndex: 0,
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

      goToPage: (index) => {
        const s = get();
        if (index < 0 || index >= s.pages.length || index === s.pageIndex) return;
        set({
          pages: syncCurrentPage(s),
          pageIndex: index,
          elements: s.pages[index].elements,
          pageStyle: s.pages[index].pageStyle,
          selectedIds: [],
        });
      },

      addPage: () => {
        checkpoint(true);
        const s = get();
        const synced = syncCurrentPage(s);
        // A new page inherits the current page's ruling, which is almost
        // always what is wanted when continuing the same worksheet.
        const page: CanvasPage = { id: nanoid(8), pageStyle: s.pageStyle, elements: [] };
        set({
          pages: [...synced, page],
          pageIndex: synced.length,
          elements: [],
          selectedIds: [],
          dirty: true,
        });
      },

      removePage: (index) => {
        const s = get();
        // Never leave a document with no pages at all.
        if (s.pages.length <= 1) return;
        checkpoint(true);
        const synced = syncCurrentPage(s);
        const pages = synced.filter((_, i) => i !== index);
        const nextIndex = Math.min(s.pageIndex > index ? s.pageIndex - 1 : s.pageIndex, pages.length - 1);
        set({
          pages,
          pageIndex: nextIndex,
          elements: pages[nextIndex].elements,
          pageStyle: pages[nextIndex].pageStyle,
          selectedIds: [],
          dirty: true,
        });
      },
      markSaved: () => set({ dirty: false }),
      toCanvas: () => {
        const s = get();
        const pages = syncCurrentPage(s);
        const [first, ...rest] = pages;
        // Page 1 goes back into elements/pageStyle so every existing reader
        // sees the shape it always has; pages 2+ only appear when they exist.
        return {
          width: s.width,
          height: s.height,
          background: s.background,
          pageStyle: first.pageStyle,
          elements: first.elements,
          ...(rest.length > 0 ? { pages: rest } : {}),
        };
      },

      // One checkpoint for the whole gesture, then silence until it ends.
      beginGesture: () => {
        if (inGesture) return;
        checkpoint(true);
        inGesture = true;
      },

      // Reset the debounce clock too, so whatever the author does next opens
      // its own step rather than being folded into the gesture just closed.
      endGesture: () => {
        inGesture = false;
        lastCheckpointAt = 0;
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
            selectedIds: survivingSelection(s.selectedIds, previous.elements),
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
            selectedIds: survivingSelection(s.selectedIds, next.elements),
            dirty: true,
          };
        }),
    };
  });

  return store;
}

// Which of the currently-selected elements still exist after stepping through
// history. Undo and redo used to clear the selection outright, which is safe
// but means undoing a nudge drops you out of the element you were adjusting
// and snaps the properties panel back to canvas settings — so correcting a
// mistake costs you your place. Keeping the selection where the element
// survived, and dropping only ids that no longer exist, avoids both the stale
// selection and the lost place.
function survivingSelection(selectedIds: string[], elements: CanvasElement[]): string[] {
  if (selectedIds.length === 0) return selectedIds;
  const live = new Set(elements.map((e) => e.id));
  return selectedIds.filter((id) => live.has(id));
}

export type CanvasStoreApi = ReturnType<typeof createCanvasStore>;

export function useCanvasStoreInstance(initial: TemplateCanvas) {
  const [store] = useState(() => createCanvasStore(initial));
  return store;
}

export function useCanvasStore<T>(store: CanvasStoreApi, selector: (state: CanvasStore) => T): T {
  return useStore(store, selector);
}
