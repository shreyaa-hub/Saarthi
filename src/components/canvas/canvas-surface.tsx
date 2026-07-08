"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, Magnet } from "lucide-react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import { computeSnap } from "@/lib/canvas/alignment";
import { ElementBox } from "./element-box";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;
const GRID_SIZE = 8;

export function CanvasSurface({ store }: { store: CanvasStoreApi }) {
  const width = useCanvasStore(store, (s) => s.width);
  const height = useCanvasStore(store, (s) => s.height);
  const background = useCanvasStore(store, (s) => s.background);
  const elements = useCanvasStore(store, (s) => s.elements);
  const selectedIds = useCanvasStore(store, (s) => s.selectedIds);
  const { updateElement, removeElement, duplicateElement, select, selectMany } = store.getState();

  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const scale = fitScale * zoom;

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Pure derivation from the current drag position — no state needed, this
  // just recomputes on every render while dragging.
  const snapResult = useMemo(() => {
    if (!draggingId || !snapEnabled) return null;
    const dragged = elements.find((e) => e.id === draggingId);
    if (!dragged) return null;
    const others = elements.filter((e) => e.id !== draggingId);
    return { dragged, ...computeSnap(dragged, others, { width, height }) };
  }, [elements, draggingId, snapEnabled, width, height]);
  const guides = snapResult?.guides ?? [];

  // The corrective snap itself does need an effect: it writes into the
  // canvas store (an external system), not React state, while an element is
  // being dragged (moved, not resized).
  useEffect(() => {
    if (!snapResult || !draggingId) return;
    if (snapResult.dx !== 0 || snapResult.dy !== 0) {
      updateElement(draggingId, {
        x: snapResult.dragged.x + snapResult.dx,
        y: snapResult.dragged.y + snapResult.dy,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapResult, draggingId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const availableWidth = el.clientWidth - 48;
      const availableHeight = el.clientHeight - 48;
      const next = Math.min(1, availableWidth / width, availableHeight / height);
      setFitScale(next > 0 ? next : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const zoomBy = useCallback(
    (delta: number) => {
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));
    },
    [setZoom],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // Marquee (rubber-band) selection, in canvas-space coordinates.
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const marqueeMoved = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  };

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toCanvasPoint(e.clientX, e.clientY);
    marqueeMoved.current = false;
    setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleBackgroundPointerMove = (e: React.PointerEvent) => {
    if (!marquee) return;
    const p = toCanvasPoint(e.clientX, e.clientY);
    if (Math.abs(p.x - marquee.x0) > 3 || Math.abs(p.y - marquee.y0) > 3) marqueeMoved.current = true;
    setMarquee((m) => (m ? { ...m, x1: p.x, y1: p.y } : m));
  };

  const handleBackgroundPointerUp = () => {
    if (!marquee) return;
    if (!marqueeMoved.current) {
      select(null);
      setMarquee(null);
      return;
    }
    const left = Math.min(marquee.x0, marquee.x1);
    const right = Math.max(marquee.x0, marquee.x1);
    const top = Math.min(marquee.y0, marquee.y1);
    const bottom = Math.max(marquee.y0, marquee.y1);
    const hits = elements
      .filter((el) => el.x < right && el.x + el.w > left && el.y < bottom && el.y + el.h > top)
      .map((el) => el.id);
    selectMany(hits);
    setMarquee(null);
  };

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={containerRef}
        className="canvas-surface flex flex-1 items-center justify-center overflow-auto p-6"
      >
        <div
          className="relative shrink-0 shadow-lg ring-1 ring-border"
          style={{ width: width * scale, height: height * scale }}
        >
          <div
            ref={canvasRef}
            className="absolute left-0 top-0 origin-top-left"
            style={{ width, height, background, transform: `scale(${scale})` }}
            onPointerDown={handleBackgroundPointerDown}
            onPointerMove={handleBackgroundPointerMove}
            onPointerUp={handleBackgroundPointerUp}
          >
            {elements.map((el) => (
              <ElementBox
                key={el.id}
                element={el}
                selected={selectedIds.includes(el.id)}
                soleSelected={selectedIds.length === 1 && selectedIds[0] === el.id}
                scale={scale}
                gridSize={snapEnabled ? GRID_SIZE : 0}
                onSelect={(additive) => select(el.id, { additive })}
                onChange={(patch) => updateElement(el.id, patch)}
                onDelete={() => removeElement(el.id)}
                onDuplicate={() => duplicateElement(el.id)}
                onDragStart={() => setDraggingId(el.id)}
                onDragEnd={() => setDraggingId(null)}
              />
            ))}

            {marquee && (
              <div
                className="pointer-events-none absolute border border-primary bg-primary/10"
                style={{
                  left: Math.min(marquee.x0, marquee.x1),
                  top: Math.min(marquee.y0, marquee.y1),
                  width: Math.abs(marquee.x1 - marquee.x0),
                  height: Math.abs(marquee.y1 - marquee.y0),
                }}
              />
            )}

            {draggingId && guides.map((g, i) => (
              <div
                key={i}
                className="pointer-events-none absolute bg-accent"
                style={
                  g.axis === "vertical"
                    ? { left: g.position, top: 0, width: 1, height }
                    : { top: g.position, left: 0, height: 1, width }
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 border-t border-border bg-card py-1.5">
        <button
          type="button"
          onClick={() => setSnapEnabled((s) => !s)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md hover:bg-muted cursor-pointer",
            snapEnabled ? "text-primary" : "text-muted-foreground",
          )}
          title={snapEnabled ? "Snapping on (grid + alignment guides)" : "Snapping off"}
        >
          <Magnet className="size-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => zoomBy(-ZOOM_STEP)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut className="size-3.5" />
        </button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(ZOOM_STEP)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="ml-1 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
          title="Reset zoom to fit"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
