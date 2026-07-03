"use client";

import {
  Type,
  Image as ImageIcon,
  Square,
  Volume2,
  MousePointerClick,
  ListChecks,
  PenLine,
  MoveHorizontal,
  ListOrdered,
} from "lucide-react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import { createElement } from "@/lib/canvas/defaults";
import { ELEMENT_LIBRARY } from "@/lib/canvas/defaults";
import type { CanvasElementType } from "@/lib/types/canvas";

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
};

export function Palette({ store }: { store: CanvasStoreApi }) {
  const width = useCanvasStore(store, (s) => s.width);
  const height = useCanvasStore(store, (s) => s.height);
  const elementCount = useCanvasStore(store, (s) => s.elements.length);
  const { addElement } = store.getState();

  const add = (type: CanvasElementType) => {
    const el = createElement(type, width / 2 - 100 + (elementCount % 6) * 16, height / 2 - 80 + (elementCount % 6) * 16);
    addElement(el);
  };

  const content = ELEMENT_LIBRARY.filter((e) => e.group === "content");
  const interactive = ELEMENT_LIBRARY.filter((e) => e.group === "interactive");

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-card p-4 md:flex">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <div className="grid grid-cols-2 gap-2">
          {content.map((item) => {
            const Icon = ICONS[item.type];
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => add(item.type)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-secondary hover:shadow-sm cursor-pointer"
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Interactive
        </p>
        <div className="grid grid-cols-2 gap-2">
          {interactive.map((item) => {
            const Icon = ICONS[item.type];
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => add(item.type)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-secondary hover:shadow-sm cursor-pointer"
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
