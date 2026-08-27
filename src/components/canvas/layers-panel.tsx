"use client";

import { ChevronUp, ChevronDown, Trash2, Type, Image as ImageIcon, Square, Volume2, MousePointerClick, ListChecks, PenLine, MoveHorizontal, ListOrdered, LayoutGrid, List, Baseline } from "lucide-react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import type { CanvasElement, CanvasElementType } from "@/lib/types/canvas";
import { cn } from "@/lib/utils";

const ICONS: Record<CanvasElementType, typeof Type> = {
  text: Type,
  image: ImageIcon,
  shape: Square,
  audio: Volume2,
  button: MousePointerClick,
  multipleChoice: ListChecks,
  fillBlank: PenLine,
  dragMatch: MoveHorizontal,
  sequence: ListOrdered,
  sortCategorize: LayoutGrid,
  list: List,
  writingLines: Baseline,
};

// A readable label for a layer row. Falls back to the type name so an element
// with no text of its own still says what it is.
function describe(el: CanvasElement): string {
  switch (el.type) {
    case "text":
      return el.content || "Text";
    case "list":
      return el.items[0] || "List";
    case "multipleChoice":
    case "dragMatch":
    case "sequence":
      return el.prompt || el.type;
    case "fillBlank":
      return el.template || "Fill in the blank";
    case "button":
      return el.label || "Button";
    case "audio":
      return el.label || "Audio";
    case "image":
      return el.alt || "Image";
    case "shape":
      return el.shape;
    case "writingLines":
      return `Writing lines (${el.lines})`;
    default:
      return "Element";
  }
}

export function LayersPanel({ store }: { store: CanvasStoreApi }) {
  const elements = useCanvasStore(store, (s) => s.elements);
  const selectedIds = useCanvasStore(store, (s) => s.selectedIds);
  const { select, reorder, removeElement } = store.getState();

  if (elements.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-xs text-muted-foreground">
        Nothing on the canvas yet. Add something from the Elements or Text tabs.
      </p>
    );
  }

  // Topmost first, matching what the eye sees — the canvas paints in array
  // order, so the last element is the one on top.
  const ordered = [...elements].reverse();

  return (
    <div className="flex flex-col gap-1">
      {ordered.map((el) => {
        const Icon = ICONS[el.type];
        const active = selectedIds.includes(el.id);
        return (
          <div
            key={el.id}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors",
              active ? "border-primary bg-secondary" : "border-transparent hover:bg-muted",
            )}
          >
            <button
              type="button"
              onClick={() => select(el.id)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
            >
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{describe(el)}</span>
            </button>
            <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={() => reorder(el.id, "forward")}
                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label={`Bring ${describe(el)} forward`}
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => reorder(el.id, "backward")}
                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label={`Send ${describe(el)} backward`}
              >
                <ChevronDown className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeElement(el.id)}
                className="flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10 cursor-pointer"
                aria-label={`Delete ${describe(el)}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
