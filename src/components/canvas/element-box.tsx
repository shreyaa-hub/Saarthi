"use client";

import { useCallback, useRef } from "react";
import { Trash2, Copy } from "lucide-react";
import type { CanvasElement } from "@/lib/types/canvas";
import { snapToGridValue } from "@/lib/canvas/alignment";
import { ElementPreview } from "./element-preview";
import { cn } from "@/lib/utils";

type Handle = "nw" | "ne" | "sw" | "se";

const MIN_SIZE = 24;

export function ElementBox({
  element,
  selected,
  soleSelected = selected,
  scale,
  readOnly = false,
  gridSize = 0,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragEnd,
}: {
  element: CanvasElement;
  selected: boolean;
  soleSelected?: boolean;
  scale: number;
  readOnly?: boolean;
  gridSize?: number;
  onSelect: (additive: boolean) => void;
  onChange: (patch: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const dragState = useRef<{ startX: number; startY: number; elX: number; elY: number } | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    elX: number;
    elY: number;
    elW: number;
    elH: number;
    handle: Handle;
  } | null>(null);

  const handleMoveDown = useCallback(
    (e: React.PointerEvent) => {
      if (readOnly || element.locked) return;
      e.stopPropagation();
      onSelect(e.shiftKey);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = { startX: e.clientX, startY: e.clientY, elX: element.x, elY: element.y };
      onDragStart?.();
    },
    [element.x, element.y, element.locked, onSelect, readOnly, onDragStart],
  );

  const handleMoveMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      const dx = (e.clientX - dragState.current.startX) / scale;
      const dy = (e.clientY - dragState.current.startY) / scale;
      const x = snapToGridValue(Math.round(dragState.current.elX + dx), gridSize);
      const y = snapToGridValue(Math.round(dragState.current.elY + dy), gridSize);
      onChange({ x, y });
    },
    [onChange, scale, gridSize],
  );

  const handleMoveUp = useCallback(() => {
    dragState.current = null;
    onDragEnd?.();
  }, [onDragEnd]);

  const handleResizeDown = useCallback(
    (handle: Handle) => (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      resizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        elX: element.x,
        elY: element.y,
        elW: element.w,
        elH: element.h,
        handle,
      };
    },
    [element.x, element.y, element.w, element.h],
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      const rs = resizeState.current;
      if (!rs) return;
      const dx = (e.clientX - rs.startX) / scale;
      const dy = (e.clientY - rs.startY) / scale;
      const patch: Partial<CanvasElement> = {};

      const snap = (v: number) => snapToGridValue(v, gridSize);

      if (rs.handle === "se") {
        patch.w = snap(Math.max(MIN_SIZE, Math.round(rs.elW + dx)));
        patch.h = snap(Math.max(MIN_SIZE, Math.round(rs.elH + dy)));
      } else if (rs.handle === "ne") {
        patch.w = snap(Math.max(MIN_SIZE, Math.round(rs.elW + dx)));
        const h = Math.max(MIN_SIZE, Math.round(rs.elH - dy));
        patch.h = snap(h);
        patch.y = snap(Math.round(rs.elY + (rs.elH - h)));
      } else if (rs.handle === "sw") {
        const w = Math.max(MIN_SIZE, Math.round(rs.elW - dx));
        patch.w = snap(w);
        patch.x = snap(Math.round(rs.elX + (rs.elW - w)));
        patch.h = snap(Math.max(MIN_SIZE, Math.round(rs.elH + dy)));
      } else if (rs.handle === "nw") {
        const w = Math.max(MIN_SIZE, Math.round(rs.elW - dx));
        const h = Math.max(MIN_SIZE, Math.round(rs.elH - dy));
        patch.x = snap(Math.round(rs.elX + (rs.elW - w)));
        patch.y = snap(Math.round(rs.elY + (rs.elH - h)));
        patch.w = snap(w);
        patch.h = snap(h);
      }
      onChange(patch);
    },
    [onChange, scale, gridSize],
  );

  const handleResizeUp = useCallback(() => {
    resizeState.current = null;
  }, []);

  return (
    <div
      className={cn(
        "absolute select-none",
        !readOnly && "cursor-move",
        selected && !readOnly && "outline outline-2 outline-primary outline-offset-2",
      )}
      style={{
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      }}
      onPointerDown={handleMoveDown}
      onPointerMove={handleMoveMove}
      onPointerUp={handleMoveUp}
      onClick={(e) => e.stopPropagation()}
    >
      <ElementPreview element={element} />

      {soleSelected && !readOnly && (
        <>
          <div className="absolute -top-9 right-0 flex items-center gap-1 rounded-md border border-border bg-card p-1 shadow-sm">
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10 cursor-pointer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {(["nw", "ne", "sw", "se"] as Handle[]).map((h) => (
            <div
              key={h}
              onPointerDown={handleResizeDown(h)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeUp}
              className={cn(
                "absolute size-3 rounded-full border-2 border-primary bg-white",
                h === "nw" && "-left-1.5 -top-1.5 cursor-nwse-resize",
                h === "ne" && "-right-1.5 -top-1.5 cursor-nesw-resize",
                h === "sw" && "-left-1.5 -bottom-1.5 cursor-nesw-resize",
                h === "se" && "-right-1.5 -bottom-1.5 cursor-nwse-resize",
              )}
            />
          ))}
        </>
      )}
    </div>
  );
}
