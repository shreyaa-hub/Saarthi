"use client";

import { nanoid } from "nanoid";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import type {
  CanvasElement,
  MultipleChoiceElement,
  DragMatchElement,
  SequenceElement,
  SortCategorizeElement,
  ListElement,
  WritingLinesElement,
  PageStyle,
} from "@/lib/types/canvas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Copy, ChevronsUp, ChevronsDown, ChevronUp, ChevronDown } from "lucide-react";
import { ImageUploadButton } from "./image-upload-button";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </Field>
  );
}

export function PropertiesPanel({ store }: { store: CanvasStoreApi }) {
  const selectedIds = useCanvasStore(store, (s) => s.selectedIds);
  const elements = useCanvasStore(store, (s) => s.elements);
  const width = useCanvasStore(store, (s) => s.width);
  const height = useCanvasStore(store, (s) => s.height);
  const background = useCanvasStore(store, (s) => s.background);
  const pageStyle = useCanvasStore(store, (s) => s.pageStyle);
  const { updateElement, setBackground, setSize, setPageStyle, reorder, removeSelected, duplicateSelected } =
    store.getState();

  const selected = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) ?? null : null;

  if (selectedIds.length > 1) {
    return (
      <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-card p-4 lg:flex">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selectedIds.length} elements selected
        </p>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={duplicateSelected}>
            <Copy className="size-3.5" /> Duplicate group
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={removeSelected}>
            <Trash2 className="size-3.5" /> Delete group
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Shift-click an element to adjust the selection, or drag on empty canvas to marquee-select.
        </p>
      </aside>
    );
  }

  if (!selected) {
    return (
      <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-card p-4 lg:flex">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Canvas settings
        </p>
        <ColorField label="Background" value={background} onChange={setBackground} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <Input
              type="number"
              value={width}
              onChange={(e) => setSize(Number(e.target.value) || width, height)}
            />
          </Field>
          <Field label="Height">
            <Input
              type="number"
              value={height}
              onChange={(e) => setSize(width, Number(e.target.value) || height)}
            />
          </Field>
        </div>
        <Field label="Page ruling">
          <Select value={pageStyle} onValueChange={(v) => setPageStyle(v as PageStyle)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="blank">Unruled (blank)</SelectItem>
              <SelectItem value="ruled">Ruled — no margin</SelectItem>
              <SelectItem value="ruled-margin">Ruled — with margin</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <p className="text-xs text-muted-foreground">
          Select an element on the canvas to edit its properties.
        </p>
      </aside>
    );
  }

  const patch = (p: Partial<CanvasElement>) => updateElement(selected.id, p);

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-card p-4 lg:flex">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {selected.type} properties
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Field label="X">
          <Input type="number" value={Math.round(selected.x)} onChange={(e) => patch({ x: Number(e.target.value) })} />
        </Field>
        <Field label="Y">
          <Input type="number" value={Math.round(selected.y)} onChange={(e) => patch({ y: Number(e.target.value) })} />
        </Field>
        <Field label="Width">
          <Input type="number" value={Math.round(selected.w)} onChange={(e) => patch({ w: Number(e.target.value) })} />
        </Field>
        <Field label="Height">
          <Input type="number" value={Math.round(selected.h)} onChange={(e) => patch({ h: Number(e.target.value) })} />
        </Field>
        <Field label="Rotation">
          <Input
            type="number"
            value={Math.round(selected.rotation ?? 0)}
            onChange={(e) => patch({ rotation: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Layer order">
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => reorder(selected.id, "back")}
            className="flex h-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="Send to back"
          >
            <ChevronsDown className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => reorder(selected.id, "backward")}
            className="flex h-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="Send backward"
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => reorder(selected.id, "forward")}
            className="flex h-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="Bring forward"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => reorder(selected.id, "front")}
            className="flex h-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="Bring to front"
          >
            <ChevronsUp className="size-3.5" />
          </button>
        </div>
      </Field>

      <Separator />

      {selected.type === "text" && (
        <>
          <Field label="Content">
            <Textarea value={selected.content} onChange={(e) => patch({ content: e.target.value })} rows={3} />
          </Field>
          <Field label="Font size">
            <Input type="number" value={selected.fontSize} onChange={(e) => patch({ fontSize: Number(e.target.value) })} />
          </Field>
          <Field label="Weight">
            <Select value={selected.fontWeight} onValueChange={(v) => patch({ fontWeight: v as typeof selected.fontWeight })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Align">
            <Select value={selected.align} onValueChange={(v) => patch({ align: v as typeof selected.align })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ColorField label="Color" value={selected.color} onChange={(v) => patch({ color: v })} />
        </>
      )}

      {selected.type === "image" && (
        <>
          <Field label="Image">
            <div className="flex flex-col gap-2">
              {selected.src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.src}
                  alt=""
                  className="h-24 w-full rounded-md border border-border object-cover"
                />
              )}
              <ImageUploadButton onUploaded={(url) => patch({ src: url })} />
            </div>
          </Field>
          <Field label="Image URL">
            <Input value={selected.src} onChange={(e) => patch({ src: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Alt text">
            <Input value={selected.alt} onChange={(e) => patch({ alt: e.target.value })} />
          </Field>
          <Field label="Fit">
            <Select value={selected.objectFit} onValueChange={(v) => patch({ objectFit: v as typeof selected.objectFit })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Corner radius">
            <Input type="number" value={selected.radius} onChange={(e) => patch({ radius: Number(e.target.value) })} />
          </Field>
        </>
      )}

      {selected.type === "shape" && (
        <>
          <Field label="Shape">
            <Select value={selected.shape} onValueChange={(v) => patch({ shape: v as typeof selected.shape })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="circle">Circle</SelectItem>
                <SelectItem value="star">Star</SelectItem>
                <SelectItem value="speech-bubble">Speech bubble</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ColorField label="Fill" value={selected.fill} onChange={(v) => patch({ fill: v })} />
          <ColorField label="Stroke" value={selected.stroke} onChange={(v) => patch({ stroke: v })} />
          <Field label="Stroke width">
            <Input type="number" value={selected.strokeWidth} onChange={(e) => patch({ strokeWidth: Number(e.target.value) })} />
          </Field>
        </>
      )}

      {selected.type === "audio" && (
        <>
          <Field label="Audio URL">
            <Input value={selected.src} onChange={(e) => patch({ src: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Label">
            <Input value={selected.label} onChange={(e) => patch({ label: e.target.value })} />
          </Field>
        </>
      )}

      {selected.type === "button" && (
        <>
          <Field label="Label">
            <Input value={selected.label} onChange={(e) => patch({ label: e.target.value })} />
          </Field>
          <Field label="Action">
            <Select value={selected.action} onValueChange={(v) => patch({ action: v as typeof selected.action })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="next">Next screen</SelectItem>
                <SelectItem value="submit">Submit activity</SelectItem>
                <SelectItem value="restart">Restart</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Style">
            <Select value={selected.style} onValueChange={(v) => patch({ style: v as typeof selected.style })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="accent">Accent</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}

      {selected.type === "multipleChoice" && (
        <MultipleChoiceFields element={selected} patch={patch} />
      )}

      {selected.type === "fillBlank" && (
        <>
          <Field label="Template (use ___ for blank)">
            <Textarea value={selected.template} onChange={(e) => patch({ template: e.target.value })} rows={2} />
          </Field>
          <Field label="Answer">
            <Input value={selected.answer} onChange={(e) => patch({ answer: e.target.value })} />
          </Field>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.caseSensitive}
              onCheckedChange={(v) => patch({ caseSensitive: Boolean(v) })}
              id="case-sensitive"
            />
            <Label htmlFor="case-sensitive" className="text-xs font-normal">Case sensitive</Label>
          </div>
        </>
      )}

      {selected.type === "text" && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="text-italic"
              checked={Boolean(selected.italic)}
              onCheckedChange={(v) => patch({ italic: Boolean(v) })}
            />
            <Label htmlFor="text-italic" className="text-xs font-normal">Italic</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="text-underline"
              checked={Boolean(selected.underline)}
              onCheckedChange={(v) => patch({ underline: Boolean(v) })}
            />
            <Label htmlFor="text-underline" className="text-xs font-normal">Underline</Label>
          </div>
        </div>
      )}

      {selected.type === "dragMatch" && <DragMatchFields element={selected} patch={patch} />}

      {selected.type === "sequence" && <SequenceFields element={selected} patch={patch} />}

      {selected.type === "sortCategorize" && (
        <SortCategorizeFields element={selected} patch={patch} />
      )}

      {selected.type === "list" && <ListFields element={selected} patch={patch} />}

      {selected.type === "writingLines" && <WritingLinesFields element={selected} patch={patch} />}
    </aside>
  );
}

function ListFields({
  element,
  patch,
}: {
  element: ListElement;
  patch: (p: Partial<ListElement>) => void;
}) {
  const setItem = (i: number, value: string) => {
    const items = [...element.items];
    items[i] = value;
    patch({ items });
  };

  return (
    <>
      <Field label="Style">
        <Select
          value={element.ordered ? "numbered" : "bulleted"}
          onValueChange={(v) => patch({ ordered: v === "numbered" })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bulleted">Bulleted</SelectItem>
            <SelectItem value="numbered">Numbered</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Items">
        <div className="flex flex-col gap-1.5">
          {element.items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input value={item} onChange={(e) => setItem(i, e.target.value)} />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => patch({ items: element.items.filter((_, j) => j !== i) })}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => patch({ items: [...element.items, "New point"] })}
          >
            Add item
          </Button>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Font size">
          <Input
            type="number"
            value={element.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) })}
          />
        </Field>
        <Field label="Line gap">
          <Input
            type="number"
            value={element.lineGap}
            onChange={(e) => patch({ lineGap: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Colour">
        <Input type="color" value={element.color} onChange={(e) => patch({ color: e.target.value })} />
      </Field>
    </>
  );
}

function WritingLinesFields({
  element,
  patch,
}: {
  element: WritingLinesElement;
  patch: (p: Partial<WritingLinesElement>) => void;
}) {
  return (
    <>
      <Field label="Ruling">
        <Select value={element.guide} onValueChange={(v) => patch({ guide: v as WritingLinesElement["guide"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single lines</SelectItem>
            <SelectItem value="dotted-midline">Handwriting (dotted midline)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Lines">
          <Input
            type="number"
            min={1}
            value={element.lines}
            onChange={(e) => patch({ lines: Math.max(1, Number(e.target.value)) })}
          />
        </Field>
        <Field label="Line gap">
          <Input
            type="number"
            value={element.lineGap}
            onChange={(e) => patch({ lineGap: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Colour">
        <Input type="color" value={element.color} onChange={(e) => patch({ color: e.target.value })} />
      </Field>
    </>
  );
}

function MultipleChoiceFields({
  element,
  patch,
}: {
  element: MultipleChoiceElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const update = (i: number, p: Partial<MultipleChoiceElement["options"][number]>) => {
    const options = element.options.map((o, idx) => (idx === i ? { ...o, ...p } : o));
    patch({ options });
  };

  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={element.allowMultiple}
          onCheckedChange={(v) => patch({ allowMultiple: Boolean(v) })}
          id="allow-multiple"
        />
        <Label htmlFor="allow-multiple" className="text-xs font-normal">Allow multiple correct answers</Label>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Options</Label>
        {element.options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <Checkbox checked={o.correct} onCheckedChange={(v) => update(i, { correct: Boolean(v) })} />
            <Input value={o.label} onChange={(e) => update(i, { label: e.target.value })} className="flex-1" />
            <button
              type="button"
              onClick={() => patch({ options: element.options.filter((_, idx) => idx !== i) })}
              className="text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              options: [...element.options, { id: nanoid(8), label: "New option", correct: false }],
            })
          }
        >
          <Plus className="size-3.5" /> Add option
        </Button>
      </div>
    </>
  );
}

function DragMatchFields({
  element,
  patch,
}: {
  element: DragMatchElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const update = (i: number, p: Partial<DragMatchElement["pairs"][number]>) => {
    patch({ pairs: element.pairs.map((pair, idx) => (idx === i ? { ...pair, ...p } : pair)) });
  };

  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Pairs</Label>
        {element.pairs.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <Input value={p.left} onChange={(e) => update(i, { left: e.target.value })} placeholder="Left" />
            <Input value={p.right} onChange={(e) => update(i, { right: e.target.value })} placeholder="Right" />
            <button
              type="button"
              onClick={() => patch({ pairs: element.pairs.filter((_, idx) => idx !== i) })}
              className="text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({ pairs: [...element.pairs, { id: nanoid(8), left: "Left", right: "Right" }] })
          }
        >
          <Plus className="size-3.5" /> Add pair
        </Button>
      </div>
    </>
  );
}

function SequenceFields({
  element,
  patch,
}: {
  element: SequenceElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const sorted = [...element.items].sort((a, b) => a.order - b.order);
  const update = (id: string, label: string) => {
    patch({ items: element.items.map((it) => (it.id === id ? { ...it, label } : it)) });
  };
  const move = (id: string, dir: -1 | 1) => {
    const idx = sorted.findIndex((it) => it.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const next = [...sorted];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    patch({ items: next.map((it, i) => ({ ...it, order: i + 1 })) });
  };

  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Steps (in correct order)</Label>
        {sorted.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2">
            <span className="w-4 text-xs font-semibold text-primary">{i + 1}</span>
            <Input value={it.label} onChange={(e) => update(it.id, e.target.value)} className="flex-1" />
            <button type="button" onClick={() => move(it.id, -1)} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30" disabled={i === 0}>↑</button>
            <button type="button" onClick={() => move(it.id, 1)} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30" disabled={i === sorted.length - 1}>↓</button>
            <button
              type="button"
              onClick={() => patch({ items: element.items.filter((x) => x.id !== it.id) })}
              className="text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              items: [...element.items, { id: nanoid(8), label: "New step", order: element.items.length + 1 }],
            })
          }
        >
          <Plus className="size-3.5" /> Add step
        </Button>
      </div>
    </>
  );
}

function SortCategorizeFields({
  element,
  patch,
}: {
  element: SortCategorizeElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const updateCategory = (i: number, label: string) => {
    patch({ categories: element.categories.map((c, idx) => (idx === i ? { ...c, label } : c)) });
  };

  // An item pointing at a removed category would score as permanently wrong
  // with nowhere correct left to place it, so it's reassigned to whichever
  // category remains first rather than left dangling on a deleted id.
  const removeCategory = (id: string) => {
    const remaining = element.categories.filter((c) => c.id !== id);
    const fallback = remaining[0]?.id ?? "";
    patch({
      categories: remaining,
      items: element.items.map((it) => (it.categoryId === id ? { ...it, categoryId: fallback } : it)),
    });
  };

  const updateItem = (i: number, p: Partial<SortCategorizeElement["items"][number]>) => {
    patch({ items: element.items.map((it, idx) => (idx === i ? { ...it, ...p } : it)) });
  };

  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>

      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Categories</Label>
        {element.categories.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <Input value={c.label} onChange={(e) => updateCategory(i, e.target.value)} />
            <button
              type="button"
              onClick={() => removeCategory(c.id)}
              disabled={element.categories.length <= 1}
              className="text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-30"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({ categories: [...element.categories, { id: nanoid(8), label: "New category" }] })
          }
        >
          <Plus className="size-3.5" /> Add category
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Items</Label>
        {element.items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2">
            <Input
              value={it.label}
              onChange={(e) => updateItem(i, { label: e.target.value })}
              className="flex-1"
            />
            <Select value={it.categoryId} onValueChange={(v) => updateItem(i, { categoryId: v })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {element.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => patch({ items: element.items.filter((x) => x.id !== it.id) })}
              className="text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              items: [
                ...element.items,
                { id: nanoid(8), label: "New item", categoryId: element.categories[0]?.id ?? "" },
              ],
            })
          }
        >
          <Plus className="size-3.5" /> Add item
        </Button>
      </div>
    </>
  );
}
