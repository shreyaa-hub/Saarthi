import { describe, it, expect } from "vitest";
import { createCanvasStore } from "@/lib/canvas/store";
import { EMPTY_CANVAS, type CanvasElement } from "@/lib/types/canvas";

// History is the part of the editor a clinician only notices when it is
// wrong, and both bugs covered here were invisible to the type checker: a
// drag that cost several Ctrl+Zs to reverse, and an undo that dropped the
// selection so the properties panel jumped back to canvas settings mid-edit.

const box = (id: string, x = 0, y = 0): CanvasElement => ({
  id, type: "shape", x, y, w: 100, h: 100,
  shape: "rectangle", fill: "#fff", stroke: "#000", strokeWidth: 1,
});

const posOf = (store: ReturnType<typeof createCanvasStore>, id: string) => {
  const el = store.getState().elements.find((e) => e.id === id);
  return el ? { x: el.x, y: el.y } : null;
};

describe("canvas store: gesture history", () => {
  it("collapses a whole drag into one undo step", () => {
    const store = createCanvasStore(EMPTY_CANVAS);
    store.getState().addElement(box("a", 10, 10));

    // What a pointer drag looks like from the store's side: one begin, many
    // moves, one end. The moves are deliberately not debounce-spaced — the
    // gesture flag, not the clock, is what has to hold them together.
    store.getState().beginGesture();
    for (let i = 1; i <= 20; i++) store.getState().updateElement("a", { x: 10 + i * 5, y: 10 + i * 3 });
    store.getState().endGesture();

    expect(posOf(store, "a")).toEqual({ x: 110, y: 70 });
    store.getState().undo();
    expect(posOf(store, "a")).toEqual({ x: 10, y: 10 });
  });

  it("starts a fresh step for whatever happens after a gesture", () => {
    const store = createCanvasStore(EMPTY_CANVAS);
    store.getState().addElement(box("a", 0, 0));

    store.getState().beginGesture();
    store.getState().updateElement("a", { x: 50, y: 50 });
    store.getState().endGesture();
    store.getState().updateElement("a", { x: 90, y: 90 });

    store.getState().undo();
    expect(posOf(store, "a")).toEqual({ x: 50, y: 50 });
    store.getState().undo();
    expect(posOf(store, "a")).toEqual({ x: 0, y: 0 });
  });

  it("keeps the selection through undo and redo", () => {
    const store = createCanvasStore(EMPTY_CANVAS);
    store.getState().addElement(box("a"));
    expect(store.getState().selectedIds).toEqual(["a"]);

    store.getState().beginGesture();
    store.getState().updateElement("a", { x: 40, y: 40 });
    store.getState().endGesture();

    store.getState().undo();
    expect(store.getState().selectedIds).toEqual(["a"]);
    store.getState().redo();
    expect(store.getState().selectedIds).toEqual(["a"]);
  });

  it("drops a selected id that the undo removed", () => {
    const store = createCanvasStore(EMPTY_CANVAS);
    store.getState().addElement(box("a"));
    // Undoing the add takes the element with it, so keeping "a" selected
    // would leave the panel bound to something that no longer exists.
    store.getState().undo();
    expect(store.getState().elements).toEqual([]);
    expect(store.getState().selectedIds).toEqual([]);
  });
});
