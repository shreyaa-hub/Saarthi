"use client";

import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  List as ListIcon,
  ListOrdered,
  Minus,
  Plus,
} from "lucide-react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import type { CanvasElement, PageStyle } from "@/lib/types/canvas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// A Canva-style contextual bar across the top of the canvas, showing the few
// controls you reach for constantly for whatever is selected.
//
// Deliberately ADDITIVE: the properties panel on the right keeps every
// control it had, including the ones duplicated here. Both write through the
// same updateElement action, so they cannot drift — this is a shortcut to the
// common cases, not a replacement, and nothing became unreachable.
export function SelectionToolbar({ store }: { store: CanvasStoreApi }) {
  const elements = useCanvasStore(store, (s) => s.elements);
  const selectedIds = useCanvasStore(store, (s) => s.selectedIds);
  const pageStyle = useCanvasStore(store, (s) => s.pageStyle);
  const { updateElement, setPageStyle, duplicateSelected, removeSelected } = store.getState();

  const selected = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) ?? null : null;
  const patch = (p: Partial<CanvasElement>) => selected && updateElement(selected.id, p);

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-card px-3">
      {selectedIds.length > 1 && (
        <>
          <span className="mr-1 text-xs text-muted-foreground">{selectedIds.length} selected</span>
          <IconButton label="Duplicate group" onClick={duplicateSelected}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton label="Delete group" destructive onClick={removeSelected}>
            <Trash2 className="size-4" />
          </IconButton>
        </>
      )}

      {!selected && selectedIds.length === 0 && (
        <>
          <span className="mr-1 text-xs text-muted-foreground">Page</span>
          <Select value={pageStyle} onValueChange={(v) => setPageStyle(v as PageStyle)}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="blank">Unruled (blank)</SelectItem>
              <SelectItem value="ruled">Ruled — no margin</SelectItem>
              <SelectItem value="ruled-margin">Ruled — with margin</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-2 text-xs text-muted-foreground">
            Select something on the page to edit it.
          </span>
        </>
      )}

      {selected?.type === "text" && (
        <>
          <Stepper
            label="Font size"
            value={selected.fontSize}
            onChange={(v) => patch({ fontSize: v })}
            min={8}
            max={200}
          />
          <Divider />
          <IconButton
            label="Bold"
            active={selected.fontWeight === "bold"}
            onClick={() => patch({ fontWeight: selected.fontWeight === "bold" ? "normal" : "bold" })}
          >
            <Bold className="size-4" />
          </IconButton>
          <IconButton
            label="Italic"
            active={Boolean(selected.italic)}
            onClick={() => patch({ italic: !selected.italic })}
          >
            <Italic className="size-4" />
          </IconButton>
          <IconButton
            label="Underline"
            active={Boolean(selected.underline)}
            onClick={() => patch({ underline: !selected.underline })}
          >
            <Underline className="size-4" />
          </IconButton>
          <Divider />
          {(["left", "center", "right"] as const).map((a) => (
            <IconButton
              key={a}
              label={`Align ${a}`}
              active={selected.align === a}
              onClick={() => patch({ align: a })}
            >
              {a === "left" ? (
                <AlignLeft className="size-4" />
              ) : a === "center" ? (
                <AlignCenter className="size-4" />
              ) : (
                <AlignRight className="size-4" />
              )}
            </IconButton>
          ))}
          <Divider />
          <ColorSwatch label="Text colour" value={selected.color} onChange={(v) => patch({ color: v })} />
        </>
      )}

      {selected?.type === "shape" && (
        <>
          <ColorSwatch label="Fill" value={selected.fill} onChange={(v) => patch({ fill: v })} />
          <ColorSwatch label="Border" value={selected.stroke} onChange={(v) => patch({ stroke: v })} />
          <Divider />
          <Stepper
            label="Border width"
            value={selected.strokeWidth}
            onChange={(v) => patch({ strokeWidth: v })}
            min={0}
            max={40}
          />
        </>
      )}

      {selected?.type === "list" && (
        <>
          <IconButton
            label="Bulleted"
            active={!selected.ordered}
            onClick={() => patch({ ordered: false })}
          >
            <ListIcon className="size-4" />
          </IconButton>
          <IconButton label="Numbered" active={selected.ordered} onClick={() => patch({ ordered: true })}>
            <ListOrdered className="size-4" />
          </IconButton>
          <Divider />
          <Stepper
            label="Font size"
            value={selected.fontSize}
            onChange={(v) => patch({ fontSize: v })}
            min={8}
            max={120}
          />
          <Divider />
          <ColorSwatch label="Text colour" value={selected.color} onChange={(v) => patch({ color: v })} />
        </>
      )}

      {selected?.type === "writingLines" && (
        <>
          <Stepper label="Lines" value={selected.lines} onChange={(v) => patch({ lines: v })} min={1} max={40} />
          <Divider />
          <Stepper
            label="Line gap"
            value={selected.lineGap}
            onChange={(v) => patch({ lineGap: v })}
            min={12}
            max={120}
          />
          <Divider />
          <ColorSwatch label="Line colour" value={selected.color} onChange={(v) => patch({ color: v })} />
        </>
      )}

      {selected && (
        <>
          <div className="ml-auto" />
          <IconButton label="Duplicate" onClick={duplicateSelected}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton label="Delete" destructive onClick={removeSelected}>
            <Trash2 className="size-4" />
          </IconButton>
        </>
      )}
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

function IconButton({
  label,
  onClick,
  active = false,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : active
            ? "bg-secondary text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex shrink-0 items-center gap-0.5" title={label}>
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value - 1))}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        aria-label={label}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="h-8 w-14 rounded-md border border-input bg-transparent px-1.5 text-center text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value + 1))}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-1.5" title={label}>
      <span className="sr-only">{label}</span>
      <span
        className="size-6 rounded-md border border-input"
        style={{ background: value }}
        aria-hidden
      />
      <input
        type="color"
        aria-label={label}
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="size-0 opacity-0"
      />
    </label>
  );
}
