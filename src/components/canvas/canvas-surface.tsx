"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, Magnet } from "lucide-react";
import { toast } from "sonner";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import { computeSnap } from "@/lib/canvas/alignment";
import { pageStyleBackground } from "@/lib/canvas/page-style";
import { createElement } from "@/lib/canvas/defaults";
import { ELEMENT_DND_TYPE } from "@/lib/canvas/dnd";
import { uploadImageFile, dragCarriesFiles } from "@/lib/canvas/upload-image";
import type { CanvasElementType } from "@/lib/types/canvas";
import { ElementBox } from "./element-box";
import { useEditorMode } from "./editor-mode";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;
const GRID_SIZE = 8;

export function CanvasSurface({ store }: { store: CanvasStoreApi }) {
  const width = useCanvasStore(store, (s) => s.width);
  const height = useCanvasStore(store, (s) => s.height);
  const background = useCanvasStore(store, (s) => s.background);
  const pageStyle = useCanvasStore(store, (s) => s.pageStyle);
  const elements = useCanvasStore(store, (s) => s.elements);
  const selectedIds = useCanvasStore(store, (s) => s.selectedIds);
  const { updateElement, removeElement, duplicateElement, reorder, select, selectMany, beginGesture, endGesture } =
    store.getState();

  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const scale = fitScale * zoom;

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const { guest } = useEditorMode();

  // Two very different things can be dropped here, told apart by MIME type:
  // an element dragged from the sidebar palette (carries ELEMENT_DND_TYPE),
  // or a real picture dragged in from the OS (carries "Files", the browser's
  // own type for a file drag — dataTransfer.files itself is only populated
  // at drop time, so dragover has to check .types instead). Both need
  // preventDefault() on dragover or the browser refuses the drop entirely;
  // a file drop specifically needs it on drop too, or the browser's fallback
  // is to navigate the tab to the raw image file, which would abandon
  // whatever was being edited.
  const handleDragOver = useCallback((e: React.DragEvent) => {
    const isElement = e.dataTransfer.types.includes(ELEMENT_DND_TYPE);
    const isFile = dragCarriesFiles(e.dataTransfer);
    if (!isElement && !isFile) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  }, []);

  // Where a dropped image (or the nth of several, dropped together) lands,
  // in canvas coordinates — client coordinates have to be divided back
  // through the current zoom, or a drop while zoomed out would land far from
  // the cursor. Successive images cascade slightly so a multi-file drop
  // doesn't stack every image exactly on top of the last.
  const dropPoint = useCallback(
    (e: React.DragEvent, index: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scale + index * 16,
        y: (e.clientY - rect.top) / scale + index * 16,
      };
    },
    [scale],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const raw = e.dataTransfer.getData(ELEMENT_DND_TYPE);

      if (raw) {
        e.preventDefault();
        setDropActive(false);
        const { x, y } = dropPoint(e, 0);
        const el = createElement(raw as CanvasElementType, 0, 0);
        const placed = { ...el, x: Math.round(x - el.w / 2), y: Math.round(y - el.h / 2) };
        store.getState().addElement(placed);
        store.getState().select(placed.id);
        return;
      }

      if (!dragCarriesFiles(e.dataTransfer)) return;
      e.preventDefault();
      setDropActive(false);

      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) {
        toast.error("Drop an image file to add it to the page.");
        return;
      }
      if (guest) {
        toast.error("Uploading images needs a free account. You can still paste an image address in.");
        return;
      }

      files.forEach((file, i) => {
        const { x, y } = dropPoint(e, i);
        const el = createElement("image", 0, 0);
        const placed = { ...el, x: Math.round(x - el.w / 2), y: Math.round(y - el.h / 2) };
        store.getState().addElement(placed);
        store.getState().select(placed.id);

        uploadImageFile(file).then((result) => {
          if ("error" in result) {
            store.getState().removeElement(placed.id);
            toast.error(result.error);
            return;
          }
          store.getState().updateElement(placed.id, { src: result.url });
        });
      });
    },
    [dropPoint, guest, store],
  );

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
          className={cn(
            "relative shrink-0 shadow-lg ring-1 transition-shadow",
            dropActive ? "ring-2 ring-primary" : "ring-border",
          )}
          style={{ width: width * scale, height: height * scale }}
        >
          <div
            ref={canvasRef}
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width,
              height,
              transform: `scale(${scale})`,
              ...pageStyleBackground(pageStyle, background),
            }}
            onPointerDown={handleBackgroundPointerDown}
            onPointerMove={handleBackgroundPointerMove}
            onPointerUp={handleBackgroundPointerUp}
            onDragOver={handleDragOver}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDrop}
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
                onReorder={(direction) => reorder(el.id, direction)}
                // beginGesture/endGesture bracket the whole drag or resize
                // into a single undo step; setDraggingId drives the alignment
                // guides. Both start and stop at the same moment.
                onDragStart={() => {
                  beginGesture();
                  setDraggingId(el.id);
                }}
                onDragEnd={() => {
                  endGesture();
                  setDraggingId(null);
                }}
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
