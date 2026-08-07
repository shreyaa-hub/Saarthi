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
  List,
  Baseline,
} from "lucide-react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import { createElement } from "@/lib/canvas/defaults";
import { elementsForSurface, type ElementSurface } from "@/lib/canvas/defaults";
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
  list: List,
  writingLines: Baseline,
};

const GROUP_LABELS: Record<string, string> = {
  content: "Content",
  worksheet: "Worksheet",
  interactive: "Interactive",
};

const GROUP_ORDER = ["content", "worksheet", "interactive"] as const;

// `surface` decides which tools exist at all. The worksheet workspace passes
// "worksheet" and never sees audio, buttons, or the scored interactive types —
// none of which mean anything on a page that gets printed and filled in by
// hand. The list comes from ELEMENT_LIBRARY rather than being hardcoded here,
// so a new element type has to declare its surfaces to appear anywhere.
export function Palette({
  store,
  surface = "activity",
}: {
  store: CanvasStoreApi;
  surface?: ElementSurface;
}) {
  const width = useCanvasStore(store, (s) => s.width);
  const height = useCanvasStore(store, (s) => s.height);
  const elementCount = useCanvasStore(store, (s) => s.elements.length);
  const { addElement } = store.getState();

  const add = (type: CanvasElementType) => {
    const el = createElement(
      type,
      width / 2 - 100 + (elementCount % 6) * 16,
      height / 2 - 80 + (elementCount % 6) * 16,
    );
    addElement(el);
  };

  const available = elementsForSurface(surface);
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: available.filter((e) => e.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-card p-4 md:flex">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {GROUP_LABELS[group] ?? group}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => {
              const Icon = ICONS[item.type];
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => add(item.type)}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-secondary hover:shadow-sm cursor-pointer"
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}
