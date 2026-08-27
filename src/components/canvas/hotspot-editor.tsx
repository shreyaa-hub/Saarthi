"use client";

import { useCallback, useRef } from "react";
import type { CanvasElement, ImageHotspotsElement } from "@/lib/types/canvas";
import { cn } from "@/lib/utils";

// Direct manipulation of "find in picture" targets: drag a region to move it,
// drag its corner to resize. Typing four percentages per target into number
// fields is technically the same data, but nobody can place a box over a dog's
// head that way — the whole point of this element type is spatial, so the
// authoring has to be spatial too.
//
// Rendered inside ElementBox, on top of the element's own preview, and only
// while that element is the sole selection. Every handler stops propagation:
// ElementBox's pointer handlers move the whole element, and without that a
// drag meant for one target would drag the entire picture across the canvas.

const MIN_PCT = 4;

export function HotspotEditor({
  element,
  scale,
  onChange,
}: {
  element: ImageHotspotsElement;
  scale: number;
  onChange: (patch: Partial<CanvasElement>) => void;
}) {
  // Held in a ref, not state: this changes on every pointermove and none of
  // it needs to trigger a render of its own — the element's own hotspot
  // values are what the overlay draws from, and those update through
  // onChange.
  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startSpot: { xPct: number; yPct: number; wPct: number; hPct: number };
  } | null>(null);

  const patchSpot = useCallback(
    (id: string, next: Partial<ImageHotspotsElement["hotspots"][number]>) => {
      onChange({
        hotspots: element.hotspots.map((h) => (h.id === id ? { ...h, ...next } : h)),
      });
    },
    [element.hotspots, onChange],
  );

  const begin = (id: string, mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const spot = element.hotspots.find((h) => h.id === id);
    if (!spot) return;
    drag.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startSpot: { xPct: spot.xPct, yPct: spot.yPct, wPct: spot.wPct, hPct: spot.hPct },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();

    // Pointer movement is in screen pixels; the element is drawn at `scale`,
    // and hotspots are percentages of the element's own box. Dividing by
    // scale converts back to canvas pixels, and dividing by the element's
    // width/height converts those to percent — so a target stays under the
    // cursor at any zoom.
    const dxPct = ((e.clientX - d.startX) / scale / element.w) * 100;
    const dyPct = ((e.clientY - d.startY) / scale / element.h) * 100;

    if (d.mode === "move") {
      patchSpot(d.id, {
        // Clamped so a target can never be dragged off the picture and
        // become unreachable.
        xPct: clamp(d.startSpot.xPct + dxPct, 0, 100 - d.startSpot.wPct),
        yPct: clamp(d.startSpot.yPct + dyPct, 0, 100 - d.startSpot.hPct),
      });
      return;
    }

    patchSpot(d.id, {
      wPct: clamp(d.startSpot.wPct + dxPct, MIN_PCT, 100 - d.startSpot.xPct),
      hPct: clamp(d.startSpot.hPct + dyPct, MIN_PCT, 100 - d.startSpot.yPct),
    });
  };

  const end = (e: React.PointerEvent) => {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
  };

  return (
    <div className="absolute inset-0">
      {element.hotspots.map((h) => (
        <div
          key={h.id}
          role="presentation"
          onPointerDown={begin(h.id, "move")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          className={cn(
            "absolute cursor-move rounded-md border-2 border-primary bg-primary/15",
            "hover:bg-primary/25",
          )}
          style={{
            left: `${h.xPct}%`,
            top: `${h.yPct}%`,
            width: `${h.wPct}%`,
            height: `${h.hPct}%`,
          }}
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 truncate bg-primary px-1 text-[10px] text-primary-foreground">
            {h.label}
          </span>
          <div
            role="presentation"
            onPointerDown={begin(h.id, "resize")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            title="Resize"
            className="absolute -bottom-1.5 -right-1.5 size-3 cursor-se-resize rounded-full border-2 border-primary bg-background"
          />
        </div>
      ))}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  // max can fall below min for a target already wider than the space left;
  // Math.min first would then return something under min, so min wins last.
  return Math.max(min, Math.min(max, value));
}
