"use client";

import { useCallback, useRef } from "react";
import type { CanvasElement, ImageHotspotsElement } from "@/lib/types/canvas";

// Direct manipulation of "find in picture" targets: drag a region to move it,
// drag its corner to resize. Typing four percentages per target into number
// fields is technically the same data, but nobody can place a box over a
// dog's head that way — the element is spatial, so authoring has to be too.
//
// Rendered by ElementBox *inside* the picture frame (via ElementPreview's
// hotspotOverlay slot), never over the whole element. That matters: with the
// picture fitted inside, the frame is smaller than the element, and an
// overlay positioned against the element would place targets somewhere
// different from where the patient eventually sees them.
//
// Every handler stops propagation — ElementBox's own pointer handlers move
// the whole element, and without that a drag meant for one target would drag
// the entire picture across the canvas.

const MIN_PCT = 4;

export function HotspotEditor({
  element,
  onChange,
}: {
  element: ImageHotspotsElement;
  onChange: (patch: Partial<CanvasElement>) => void;
}) {
  // Measured rather than derived from element.w/h and the canvas zoom: the
  // frame is the rendered picture, which is smaller than the element whenever
  // the picture is fitted inside, and its size depends on the image's own
  // aspect ratio. getBoundingClientRect gives the real on-screen box, which
  // already accounts for zoom, so one measurement replaces two assumptions.
  const frameRef = useRef<HTMLDivElement>(null);

  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    frameW: number;
    frameH: number;
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
    const rect = frameRef.current?.getBoundingClientRect();
    if (!spot || !rect || rect.width === 0 || rect.height === 0) return;
    drag.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      frameW: rect.width,
      frameH: rect.height,
      startSpot: { xPct: spot.xPct, yPct: spot.yPct, wPct: spot.wPct, hPct: spot.hPct },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();

    const dxPct = ((e.clientX - d.startX) / d.frameW) * 100;
    const dyPct = ((e.clientY - d.startY) / d.frameH) * 100;

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
    <div ref={frameRef} className="absolute inset-0">
      {element.hotspots.map((h) => (
        <div
          key={h.id}
          role="presentation"
          onPointerDown={begin(h.id, "move")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          className="absolute cursor-move rounded-md border-2 border-primary bg-primary/15 hover:bg-primary/25"
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
