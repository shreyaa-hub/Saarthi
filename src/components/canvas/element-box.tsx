"use client";

import { useCallback, useRef } from "react";
import { Trash2, Copy, ChevronUp, ChevronDown, Lock, Unlock } from "lucide-react";
import type { CanvasElement } from "@/lib/types/canvas";
import { snapToGridValue } from "@/lib/canvas/alignment";
import { ElementPreview } from "./element-preview";
import { HotspotEditor } from "./hotspot-editor";
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
  onReorder,
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
  onReorder?: (direction: "forward" | "backward") => void;
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
      if (readOnly) return;
      e.stopPropagation();
      // A locked element still selects — otherwise it could never be picked
      // to unlock again — it just refuses to move.
      onSelect(e.shiftKey);
      if (element.locked) return;
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
      if (element.locked) return;
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
    [element.x, element.y, element.w, element.h, element.locked],
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

  const editingHotspots =
    element.type === "imageHotspots" && soleSelected && !readOnly && !element.locked;

  return (
    <div
      className={cn(
        "absolute select-none",
        !readOnly && (element.locked ? "cursor-default" : "cursor-move"),
        selected && !readOnly && "outline outline-2 outline-primary outline-offset-2 rounded-[2px]",
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
      {/* Spatial elements get direct manipulation of their own inner parts
          while selected — placing a target over the thing it marks is not
          something four percentage fields can do. The preview stops drawing
          its own markers while that overlay is up, or each target would be
          outlined and labelled twice. */}
      <ElementPreview element={element} suppressHotspots={editingHotspots} />

      {editingHotspots && <HotspotEditor element={element} scale={scale} onChange={onChange} />}

      {soleSelected && !readOnly && (
        <>
          {/* Counter-rotated so the toolbar stays upright and readable even
              when the element itself is rotated. */}
          <div
            className="absolute -top-11 right-0 flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-md"
            style={element.rotation ? { transform: `rotate(${-element.rotation}deg)` } : undefined}
          >
            <ToolbarButton label="Bring forward" onClick={() => onReorder?.("forward")}>
              <ChevronUp className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton label="Send backward" onClick={() => onReorder?.("backward")}>
              <ChevronDown className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label={element.locked ? "Unlock" : "Lock position"}
              onClick={() => onChange({ locked: !element.locked })}
            >
              {element.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
            </ToolbarButton>
            <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
            <ToolbarButton label="Duplicate" onClick={onDuplicate}>
              <Copy className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton label="Delete" destructive onClick={onDelete}>
              <Trash2 className="size-3.5" />
            </ToolbarButton>
          </div>

          {!element.locked && (["nw", "ne", "sw", "se"] as Handle[]).map((h) => (
            <div
              key={h}
              onPointerDown={handleResizeDown(h)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeUp}
              className={cn(
                "absolute size-2.5 rounded-sm border-2 border-primary bg-white shadow-sm",
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

function ToolbarButton({
  label,
  onClick,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      // Stops the press from starting a drag on the element underneath.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}
