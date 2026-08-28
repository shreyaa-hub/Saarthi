"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import type {
  CanvasElement,
  MultipleChoiceElement,
  DragMatchElement,
  SequenceElement,
  SortCategorizeElement,
  MemoryMatchElement,
  WordHuntElement,
  ImageHotspotsElement,
  PracticeDrillElement,
  DrawPadElement,
  LongAnswerElement,
  YesNoElement,
  FlashcardsElement,
  CountTapElement,
  WordSearchElement,
  UnscrambleElement,
  WordChunksElement,
  PhotoHuntElement,
  SideBySideElement,
  SecretWordElement,
  ChecklistElement,
  TableElement,
  ArrowElement,
  DividerElement,
  StickerElement,
  SpeechBubbleElement,
  CalloutElement,
  SheetHeaderElement,
  LetterBoxesElement,
  NumberLineElement,
  RewardStarsElement,
  WordBankElement,
  InteractiveAppearance,
  ListElement,
  WritingLinesElement,
  PageStyle,
} from "@/lib/types/canvas";
import { APPEARANCE_DEFAULTS, MC_DEFAULT_COLUMNS } from "@/lib/types/canvas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Copy, ChevronsUp, ChevronsDown, ChevronUp, ChevronDown, X } from "lucide-react";
import { ImageUploadButton } from "./image-upload-button";
import { PairImagePicker } from "./pair-image-picker";

// A real <label> element wrapping its control, rather than a div with a
// caption above it. Nesting is what associates the two, so every field in
// this panel gets an accessible name from the text a sighted author already
// reads — without each of the several dozen callers having to invent an id
// and repeat it in an htmlFor.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label asChild className="text-xs text-muted-foreground">
        <span>{label}</span>
      </Label>
      {children}
    </label>
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
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex value`}
          className="font-mono text-xs"
        />
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
        <>
          <MultipleChoiceFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
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
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
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

      {selected.type === "dragMatch" && (
        <>
          <DragMatchFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
      )}

      {selected.type === "sequence" && (
        <>
          <SequenceFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
      )}

      {selected.type === "sortCategorize" && (
        <>
          <SortCategorizeFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
      )}

      {selected.type === "memoryMatch" && (
        <>
          <MemoryMatchFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
      )}

      {selected.type === "wordHunt" && (
        <>
          <WordHuntFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "imageHotspots" && (
        <>
          <ImageHotspotsFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "practiceDrill" && (
        <>
          <PracticeDrillFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
      )}

      {selected.type === "drawPad" && (
        <>
          <DrawPadFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "yesNo" && (
        <>
          <YesNoFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "flashcards" && (
        <>
          <FlashcardsFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "countTap" && (
        <>
          <CountTapFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
      )}

      {selected.type === "wordSearch" && (
        <>
          <WordSearchFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "unscramble" && (
        <>
          <UnscrambleFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "wordChunks" && (
        <>
          <WordChunksFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "photoHunt" && (
        <>
          <PhotoHuntFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
      )}

      {selected.type === "sideBySide" && (
        <>
          <SideBySideFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} />
        </>
      )}

      {selected.type === "secretWord" && (
        <>
          <SecretWordFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "longAnswer" && (
        <>
          <LongAnswerFields element={selected} patch={patch} />
          <AppearanceFields element={selected} patch={patch} showImageSize={false} />
        </>
      )}

      {selected.type === "list" && <ListFields element={selected} patch={patch} />}

      {selected.type === "writingLines" && <WritingLinesFields element={selected} patch={patch} />}

      {selected.type === "checklist" && <ChecklistFields element={selected} patch={patch} />}

      {selected.type === "table" && <TableFields element={selected} patch={patch} />}

      {selected.type === "arrow" && <ArrowFields element={selected} patch={patch} />}
      {selected.type === "divider" && <DividerFields element={selected} patch={patch} />}
      {selected.type === "sticker" && <StickerFields element={selected} patch={patch} />}
      {selected.type === "speechBubble" && <SpeechBubbleFields element={selected} patch={patch} />}
      {selected.type === "callout" && <CalloutFields element={selected} patch={patch} />}
      {selected.type === "sheetHeader" && <SheetHeaderFields element={selected} patch={patch} />}
      {selected.type === "letterBoxes" && <LetterBoxesFields element={selected} patch={patch} />}
      {selected.type === "numberLine" && <NumberLineFields element={selected} patch={patch} />}
      {selected.type === "rewardStars" && <RewardStarsFields element={selected} patch={patch} />}
      {selected.type === "wordBank" && <WordBankFields element={selected} patch={patch} />}
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

// A picture the patient is meant to point at needs to be big enough to be a
// picture. 140px per column is about the smallest that stays recognisable on
// a tablet held at arm's length, and it is what the auto-widen below aims at.
const MIN_PICTURE_COLUMN_PX = 140;

// The picture height a picture-choice answer gets when the author switches to
// that layout. The 28px list thumbnail default is right beside a word and
// absurd as the answer itself.
const PICTURE_CHOICE_IMAGE_PX = 96;

function columnCount(element: MultipleChoiceElement): number {
  const wanted = element.columns ?? MC_DEFAULT_COLUMNS;
  return Math.max(1, Math.min(wanted, element.options.length || 1));
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

      <Field label="Answer layout">
        <Select
          value={element.layout ?? "list"}
          onValueChange={(v) => {
            const layout = v as "list" | "grid";
            if (layout !== "grid") {
              patch({ layout });
              return;
            }
            // Switching to pictures side by side in a box sized for a stacked
            // list gives four columns about 80px wide, and a 28px-tall
            // thumbnail, which is not a picture anyone can point at. Size the
            // box and the pictures for what the layout is actually for — and
            // only ever grow them, so an author who has already set a size
            // themselves keeps it.
            const needed = columnCount(element) * MIN_PICTURE_COLUMN_PX;
            const currentPicture = element.imageSize ?? APPEARANCE_DEFAULTS.imageSize;
            patch({
              layout,
              ...(element.w < needed ? { w: needed } : {}),
              ...(currentPicture < PICTURE_CHOICE_IMAGE_PX
                ? { imageSize: PICTURE_CHOICE_IMAGE_PX }
                : {}),
            });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="list">List — answers stacked as rows</SelectItem>
            <SelectItem value="grid">Picture choice — answers side by side</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {element.layout === "grid" && (
        <Field label="Pictures across">
          <Select
            value={String(element.columns ?? MC_DEFAULT_COLUMNS)}
            onValueChange={(v) => {
              const columns = Number(v);
              const needed = Math.min(columns, element.options.length || 1) * MIN_PICTURE_COLUMN_PX;
              patch({ columns, ...(element.w < needed ? { w: needed } : {}) });
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} across</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Options</Label>
        <p className="text-[11px] text-muted-foreground">
          Tick the correct answer. Add a photo to make it a picture-choice question.
        </p>
        {element.options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <Checkbox checked={o.correct} onCheckedChange={(v) => update(i, { correct: Boolean(v) })} />
            <PairImagePicker
              src={o.imageSrc}
              onChange={(v) => update(i, { imageSrc: v })}
              label="option"
            />
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
          onClick={() => {
            const options = [...element.options, { id: nanoid(8), label: "New option", correct: false }];
            // In a picture-choice grid a new answer is a new column, so the
            // box has to grow with it — otherwise going from three pictures
            // to four just squeezes all four narrower.
            const needed =
              element.layout === "grid"
                ? Math.min(element.columns ?? MC_DEFAULT_COLUMNS, options.length) * MIN_PICTURE_COLUMN_PX
                : 0;
            patch({ options, ...(element.w < needed ? { w: needed } : {}) });
          }}
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
        <p className="text-[11px] text-muted-foreground">
          Add a photo to either side for picture matching — the word alone still works if you skip it.
        </p>
        {element.pairs.map((p, i) => (
          <div key={p.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
            <div className="flex items-center gap-2">
              <PairImagePicker
                src={p.leftImage}
                onChange={(v) => update(i, { leftImage: v })}
                label="left"
              />
              <Input
                value={p.left}
                onChange={(e) => update(i, { left: e.target.value })}
                placeholder="Left"
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <PairImagePicker
                src={p.rightImage}
                onChange={(v) => update(i, { rightImage: v })}
                label="right"
              />
              <Input
                value={p.right}
                onChange={(e) => update(i, { right: e.target.value })}
                placeholder="Right"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => patch({ pairs: element.pairs.filter((_, idx) => idx !== i) })}
                className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
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
  const update = (id: string, p: Partial<SequenceElement["items"][number]>) => {
    patch({ items: element.items.map((it) => (it.id === id ? { ...it, ...p } : it)) });
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
        <p className="text-[11px] text-muted-foreground">
          Add a photo to each step for picture sequencing. The patient always sees them shuffled.
        </p>
        {sorted.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2">
            <span className="w-4 text-xs font-semibold text-primary">{i + 1}</span>
            <PairImagePicker src={it.image} onChange={(v) => update(it.id, { image: v })} label="step" />
            <Input value={it.label} onChange={(e) => update(it.id, { label: e.target.value })} className="flex-1" />
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
            <PairImagePicker
              src={it.image}
              onChange={(v) => updateItem(i, { image: v })}
              label="item"
            />
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

// Appearance controls shared by every interactive type that draws cards of
// authored content. One component rather than the same four fields copied
// into each *Fields block, so a clinician gets the identical controls in the
// identical order whichever activity type they are editing.
//
// Colour is opt-in: until the author picks one, nothing is written to the
// element and the component keeps its theme-aware Tailwind classes (which
// work in dark mode). "Reset" clears the value back to that state rather
// than writing a hardcoded light-mode default.
function AppearanceFields({
  element,
  patch,
  showImageSize = true,
}: {
  element: InteractiveAppearance;
  patch: (p: Partial<CanvasElement>) => void;
  showImageSize?: boolean;
}) {
  return (
    <>
      <Separator />
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Appearance
      </Label>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Text size">
          <Input
            type="number"
            min={8}
            max={48}
            value={element.fontSize ?? APPEARANCE_DEFAULTS.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) || APPEARANCE_DEFAULTS.fontSize })}
          />
        </Field>
        {showImageSize && (
          <Field label="Image size">
            <Input
              type="number"
              min={16}
              max={200}
              step={4}
              value={element.imageSize ?? APPEARANCE_DEFAULTS.imageSize}
              onChange={(e) =>
                patch({ imageSize: Number(e.target.value) || APPEARANCE_DEFAULTS.imageSize })
              }
            />
          </Field>
        )}
      </div>

      {showImageSize && (
        <Field label="Image shape">
          <Select
            value={element.imageShape ?? APPEARANCE_DEFAULTS.imageShape}
            onValueChange={(v) => patch({ imageShape: v as "square" | "wide" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="wide">Landscape (wider than tall)</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <OptionalColorField
        label="Text colour"
        value={element.textColor}
        onChange={(v) => patch({ textColor: v })}
      />
      <OptionalColorField
        label="Card colour"
        value={element.cardColor}
        onChange={(v) => patch({ cardColor: v })}
      />
    </>
  );
}

function OptionalColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          // The picker needs some concrete value to show; this placeholder
          // is never written to the element unless the author actually picks.
          value={value ?? "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
        />
        <Input
          value={value ?? ""}
          placeholder="Theme default"
          onChange={(e) => onChange(e.target.value || undefined)}
          aria-label={`${label} hex value`}
          className="font-mono text-xs"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title={`Reset ${label.toLowerCase()}`}
            className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </Field>
  );
}

function MemoryMatchFields({
  element,
  patch,
}: {
  element: MemoryMatchElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const updatePair = (i: number, p: Partial<MemoryMatchElement["pairs"][number]>) => {
    patch({ pairs: element.pairs.map((pair, idx) => (idx === i ? { ...pair, ...p } : pair)) });
  };

  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Pairs to find</Label>
        <p className="text-[11px] text-muted-foreground">
          Each pair becomes two face-down cards, shuffled, that the patient flips to find.
          Fill in the second card to make the two sides different — a photo and its word,
          say. Leave it blank and both cards show the same thing.
        </p>
        {element.pairs.map((p, i) => {
          const twoSided = Boolean(p.labelB?.trim() || p.imageB);
          return (
            <div key={p.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">
                  Card 1
                </span>
                <PairImagePicker
                  src={p.image}
                  onChange={(v) => updatePair(i, { image: v })}
                  label="first card"
                />
                <Input
                  value={p.label}
                  onChange={(e) => updatePair(i, { label: e.target.value })}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => patch({ pairs: element.pairs.filter((_, idx) => idx !== i) })}
                  disabled={element.pairs.length <= 2}
                  title="Remove this pair"
                  className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">
                  Card 2
                </span>
                <PairImagePicker
                  src={p.imageB}
                  onChange={(v) => updatePair(i, { imageB: v })}
                  label="second card"
                />
                <Input
                  value={p.labelB ?? ""}
                  placeholder="Same as card 1"
                  onChange={(e) => updatePair(i, { labelB: e.target.value || undefined })}
                  className="flex-1"
                />
                {twoSided && (
                  <button
                    type="button"
                    onClick={() => updatePair(i, { labelB: undefined, imageB: undefined })}
                    title="Make both cards the same again"
                    className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({ pairs: [...element.pairs, { id: nanoid(8), label: "New pair" }] })
          }
        >
          <Plus className="size-3.5" /> Add pair
        </Button>
      </div>
    </>
  );
}

function WordHuntFields({
  element,
  patch,
}: {
  element: WordHuntElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const [draft, setDraft] = useState("");

  const addWord = () => {
    const word = draft.trim();
    if (!word) return;
    const alreadyThere = element.targetWords.some((w) => w.toLowerCase() === word.toLowerCase());
    if (!alreadyThere) {
      patch({ targetWords: [...element.targetWords, word] });
    }
    setDraft("");
  };

  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <Field label="Passage">
        <Textarea value={element.passage} onChange={(e) => patch({ passage: e.target.value })} rows={4} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Target words (case-insensitive)</Label>
        <div className="flex flex-wrap gap-1.5">
          {element.targetWords.map((w) => (
            <span
              key={w}
              className="flex items-center gap-1 rounded-full border border-primary/40 bg-secondary px-2 py-0.5 text-xs"
            >
              {w}
              <button
                type="button"
                onClick={() => patch({ targetWords: element.targetWords.filter((t) => t !== w) })}
                className="text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {element.targetWords.length === 0 && (
            <p className="text-[11px] text-muted-foreground">No target words yet.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addWord();
              }
            }}
            placeholder="Add a word"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addWord}>
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}

function ImageHotspotsFields({
  element,
  patch,
}: {
  element: ImageHotspotsElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const updateSpot = (i: number, p: Partial<ImageHotspotsElement["hotspots"][number]>) => {
    patch({ hotspots: element.hotspots.map((h, idx) => (idx === i ? { ...h, ...p } : h)) });
  };

  return (
    <>
      {/* This element needs explaining in a way the list-based ones do not:
          a clinician who drops it sees an empty box and two floating
          rectangles, with nothing on screen saying what the activity even
          is. Three sentences here is cheaper than them guessing wrong. */}
      <div className="rounded-lg border border-border bg-muted/40 p-2.5">
        <p className="mb-1 text-xs font-semibold">How this works</p>
        <ol className="ml-3.5 list-decimal space-y-0.5 text-[11px] text-muted-foreground">
          <li>Add a picture.</li>
          <li>Drag a box over each thing the patient should find, and resize it by its corner.</li>
          <li>Name each box — the patient sees that name once they find it.</li>
        </ol>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          In the activity the boxes are invisible, so the patient has to search the picture and
          tap what you asked for.
        </p>
      </div>

      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>

      <Field label="Picture">
        <ImageUploadButton onUploaded={(url) => patch({ src: url })} />
      </Field>
      <Field label="Picture URL">
        <Input value={element.src} onChange={(e) => patch({ src: e.target.value })} placeholder="https://…" />
      </Field>
      <Field label="Alt text">
        <Input value={element.alt} onChange={(e) => patch({ alt: e.target.value })} />
      </Field>

      <Field label="Picture fit">
        <Select
          value={element.fit ?? "contain"}
          onValueChange={(v) => patch({ fit: v as ImageHotspotsElement["fit"] })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Fit the whole picture inside</SelectItem>
            <SelectItem value="cover">Fill the box (crops the edges)</SelectItem>
            <SelectItem value="fill">Stretch to the box</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <p className="-mt-3 text-[11px] text-muted-foreground">
        A tall photo fitted inside leaves space either side. Fill spreads it across the whole
        box instead. Targets stay on the picture either way.
      </p>

      <div className="flex items-center gap-2">
        <Checkbox
          id="hotspot-outlines"
          checked={element.showOutlines}
          onCheckedChange={(v) => patch({ showOutlines: Boolean(v) })}
        />
        <Label htmlFor="hotspot-outlines" className="text-xs font-normal">
          Show outlines to the patient
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Things to find</Label>
        <p className="text-[11px] text-muted-foreground">
          Select the element on the canvas, then drag a target to move it or its bottom-right
          corner to resize.
        </p>
        {element.hotspots.map((h, i) => (
          <div key={h.id} className="flex items-center gap-2">
            <Input
              value={h.label}
              onChange={(e) => updateSpot(i, { label: e.target.value })}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => patch({ hotspots: element.hotspots.filter((_, idx) => idx !== i) })}
              className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
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
              hotspots: [
                ...element.hotspots,
                // Dropped near the middle, offset a little per target so a
                // run of new ones does not stack invisibly on one spot.
                {
                  id: nanoid(8),
                  label: "New thing",
                  xPct: Math.min(70, 35 + element.hotspots.length * 5),
                  yPct: Math.min(70, 35 + element.hotspots.length * 5),
                  wPct: 20,
                  hPct: 20,
                },
              ],
            })
          }
        >
          <Plus className="size-3.5" /> Add a thing to find
        </Button>
      </div>
    </>
  );
}

function PracticeDrillFields({
  element,
  patch,
}: {
  element: PracticeDrillElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const updateWord = (i: number, p: Partial<PracticeDrillElement["words"][number]>) => {
    patch({ words: element.words.map((w, idx) => (idx === i ? { ...w, ...p } : w)) });
  };

  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Words and repetitions</Label>
        {element.words.map((w, i) => (
          <div key={w.id} className="flex items-center gap-2">
            <PairImagePicker src={w.image} onChange={(v) => updateWord(i, { image: v })} label="word" />
            <Input
              value={w.label}
              onChange={(e) => updateWord(i, { label: e.target.value })}
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              max={20}
              value={w.target}
              onChange={(e) => updateWord(i, { target: Math.max(1, Number(e.target.value) || 1) })}
              className="w-14"
              title="How many times to say it"
            />
            <button
              type="button"
              onClick={() => patch({ words: element.words.filter((_, idx) => idx !== i) })}
              className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
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
            patch({ words: [...element.words, { id: nanoid(8), label: "New word", target: 5 }] })
          }
        >
          <Plus className="size-3.5" /> Add word
        </Button>
      </div>
    </>
  );
}

function DrawPadFields({
  element,
  patch,
}: {
  element: DrawPadElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <Field label="Trace over (optional)">
        <div className="flex flex-col gap-1.5">
          <ImageUploadButton onUploaded={(src) => patch({ backgroundSrc: src })} />
          {element.backgroundSrc && (
            <button
              type="button"
              onClick={() => patch({ backgroundSrc: undefined })}
              className="self-start text-xs text-muted-foreground hover:text-destructive cursor-pointer"
            >
              Remove picture
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">
            A letter, shape or maze behind the pad turns free drawing into tracing.
          </p>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Pen colour">
          <input
            type="color"
            value={element.strokeColor}
            onChange={(e) => patch({ strokeColor: e.target.value })}
            className="h-9 w-full cursor-pointer rounded-md border border-input bg-transparent p-1"
          />
        </Field>
        <Field label="Pen size">
          <Input
            type="number"
            min={1}
            max={24}
            value={element.strokeWidth}
            onChange={(e) => patch({ strokeWidth: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
      </div>
    </>
  );
}

function LongAnswerFields({
  element,
  patch,
}: {
  element: LongAnswerElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Prompt">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <Field label="Placeholder">
        <Input
          value={element.placeholder}
          onChange={(e) => patch({ placeholder: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Least words">
          <Input
            type="number"
            min={0}
            max={500}
            value={element.minWords}
            onChange={(e) => patch({ minWords: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
        <Field label="Printed lines">
          <Input
            type="number"
            min={1}
            max={30}
            value={element.lines}
            onChange={(e) => patch({ lines: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Nothing here is marked right or wrong — it counts as done once the patient has written
        that many words. Leave it at 0 to accept any answer.
      </p>
    </>
  );
}

function YesNoFields({
  element,
  patch,
}: {
  element: YesNoElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Question">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <Field label="Picture (optional)">
        <div className="flex flex-col gap-1.5">
          <ImageUploadButton onUploaded={(src) => patch({ imageSrc: src })} />
          {element.imageSrc && (
            <button
              type="button"
              onClick={() => patch({ imageSrc: undefined })}
              className="self-start text-xs text-muted-foreground hover:text-destructive cursor-pointer"
            >
              Remove picture
            </button>
          )}
        </div>
      </Field>
      <Field label="Correct answer">
        <Select
          value={element.answer}
          onValueChange={(v) => patch({ answer: v as "yes" | "no" })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">{element.yesLabel || "Yes"}</SelectItem>
            <SelectItem value="no">{element.noLabel || "No"}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Left button">
          <Input value={element.yesLabel} onChange={(e) => patch({ yesLabel: e.target.value })} />
        </Field>
        <Field label="Right button">
          <Input value={element.noLabel} onChange={(e) => patch({ noLabel: e.target.value })} />
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Rename the buttons for &ldquo;Same / Different&rdquo; or &ldquo;👍 / 👎&rdquo; — the same task,
        different words.
      </p>
    </>
  );
}

function FlashcardsFields({
  element,
  patch,
}: {
  element: FlashcardsElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const update = (i: number, p: Partial<FlashcardsElement["cards"][number]>) => {
    patch({ cards: element.cards.map((c, idx) => (idx === i ? { ...c, ...p } : c)) });
  };

  return (
    <>
      <Field label="Instruction">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Cards</Label>
        <p className="text-[11px] text-muted-foreground">
          The front is what the child sees first; tapping turns it over to the back. Nothing here is
          marked — the child says whether they knew it.
        </p>
        {element.cards.map((c, i) => (
          <div key={c.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
            <div className="flex items-center gap-2">
              <PairImagePicker src={c.frontImage} onChange={(v) => update(i, { frontImage: v })} label="front" />
              <Input
                value={c.front}
                onChange={(e) => update(i, { front: e.target.value })}
                placeholder="Front"
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <PairImagePicker src={c.backImage} onChange={(v) => update(i, { backImage: v })} label="back" />
              <Input
                value={c.back}
                onChange={(e) => update(i, { back: e.target.value })}
                placeholder="Back"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => patch({ cards: element.cards.filter((_, idx) => idx !== i) })}
                className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({ cards: [...element.cards, { id: nanoid(8), front: "Front", back: "Back" }] })
          }
        >
          <Plus className="size-3.5" /> Add card
        </Button>
      </div>
    </>
  );
}

function CountTapFields({
  element,
  patch,
}: {
  element: CountTapElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Question">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="How many">
          <Input
            type="number"
            min={1}
            max={20}
            value={element.count}
            onChange={(e) => patch({ count: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
          />
        </Field>
        <Field label="Highest choice">
          <Input
            type="number"
            min={2}
            max={10}
            value={element.maxChoice}
            onChange={(e) => patch({ maxChoice: Math.max(2, Math.min(10, Number(e.target.value) || 5)) })}
          />
        </Field>
      </div>
      <Field label="What to count">
        <Input
          value={element.emoji}
          onChange={(e) => patch({ emoji: e.target.value })}
          placeholder="🍎"
        />
      </Field>
      <Field label="Or use a picture">
        <div className="flex flex-col gap-1.5">
          <ImageUploadButton onUploaded={(src) => patch({ imageSrc: src })} />
          {element.imageSrc && (
            <button
              type="button"
              onClick={() => patch({ imageSrc: undefined })}
              className="self-start text-xs text-muted-foreground hover:text-destructive cursor-pointer"
            >
              Use the emoji instead
            </button>
          )}
        </div>
      </Field>
      <p className="text-[11px] text-muted-foreground">
        The number of pictures IS the answer, so it is never shown. The choices always run high
        enough to include it.
      </p>
    </>
  );
}

function WordSearchFields({
  element,
  patch,
}: {
  element: WordSearchElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Instruction">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <Field label="Words to hide (one per line)">
        <Textarea
          value={element.words.join("\n")}
          onChange={(e) =>
            patch({ words: e.target.value.split("\n").map((w) => w.trim()).filter(Boolean) })
          }
          rows={5}
        />
      </Field>
      <Field label="Grid size">
        <Input
          type="number"
          min={4}
          max={14}
          value={element.size}
          onChange={(e) => patch({ size: Math.max(4, Math.min(14, Number(e.target.value) || 8)) })}
        />
      </Field>
      <p className="text-[11px] text-muted-foreground">
        Words run across and down only — no diagonals or backwards, which is what makes these
        solvable for a child. A word too long for the grid is left out and named on the canvas.
      </p>
    </>
  );
}

function UnscrambleFields({
  element,
  patch,
}: {
  element: UnscrambleElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const update = (i: number, p: Partial<UnscrambleElement["words"][number]>) => {
    patch({ words: element.words.map((w, idx) => (idx === i ? { ...w, ...p } : w)) });
  };

  return (
    <>
      <Field label="Instruction">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Words</Label>
        <p className="text-[11px] text-muted-foreground">
          The letters are shuffled for the patient, and never left in the right order.
        </p>
        {element.words.map((w, i) => (
          <div key={w.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
            <div className="flex items-center gap-2">
              <Input
                value={w.word}
                onChange={(e) => update(i, { word: e.target.value })}
                placeholder="Word"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => patch({ words: element.words.filter((_, idx) => idx !== i) })}
                className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <Input
              value={w.hint ?? ""}
              onChange={(e) => update(i, { hint: e.target.value || undefined })}
              placeholder="Clue (optional)"
              aria-label="Clue"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patch({ words: [...element.words, { id: nanoid(8), word: "word" }] })}
        >
          <Plus className="size-3.5" /> Add word
        </Button>
      </div>
    </>
  );
}

function WordChunksFields({
  element,
  patch,
}: {
  element: WordChunksElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const update = (i: number, p: Partial<WordChunksElement["items"][number]>) => {
    patch({ items: element.items.map((it, idx) => (idx === i ? { ...it, ...p } : it)) });
  };

  return (
    <>
      <Field label="Instruction">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Words and their chunks</Label>
        <p className="text-[11px] text-muted-foreground">
          Separate the chunks with a hyphen, like but-ter-fly. Marked on the chunks in order, not
          the letters they spell — otherwise &ldquo;but-terf-ly&rdquo; would pass a syllable task.
        </p>
        {element.items.map((it, i) => (
          <div key={it.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
            <div className="flex items-center gap-2">
              <Input
                value={it.word}
                onChange={(e) => update(i, { word: e.target.value })}
                placeholder="Word"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => patch({ items: element.items.filter((_, idx) => idx !== i) })}
                className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <Input
              value={it.chunks.join("-")}
              onChange={(e) =>
                update(i, {
                  chunks: e.target.value.split("-").map((c) => c.trim()).filter(Boolean),
                })
              }
              placeholder="but-ter-fly"
              aria-label="Chunks"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({ items: [...element.items, { id: nanoid(8), word: "word", chunks: ["wo", "rd"] }] })
          }
        >
          <Plus className="size-3.5" /> Add word
        </Button>
      </div>
    </>
  );
}

function PhotoHuntFields({
  element,
  patch,
}: {
  element: PhotoHuntElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const update = (i: number, p: Partial<PhotoHuntElement["items"][number]>) => {
    patch({ items: element.items.map((it, idx) => (idx === i ? { ...it, ...p } : it)) });
  };

  return (
    <>
      <Field label="Instruction">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <Field label="Pictures across">
        <Select value={String(element.columns)} onValueChange={(v) => patch({ columns: Number(v) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2, 3, 4, 5, 6].map((n) => (
              <SelectItem key={n} value={String(n)}>{n} across</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Pictures</Label>
        <p className="text-[11px] text-muted-foreground">
          Tick the ones the patient should find. An emoji needs no upload; a photo replaces it.
          Wrong taps are subtracted, so tapping everything scores nothing.
        </p>
        {element.items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2">
            <Checkbox
              checked={it.isTarget}
              onCheckedChange={(v) => update(i, { isTarget: Boolean(v) })}
              aria-label={`${it.label} is one to find`}
            />
            <PairImagePicker src={it.imageSrc} onChange={(v) => update(i, { imageSrc: v })} label="picture" />
            <Input
              value={it.emoji ?? ""}
              onChange={(e) => update(i, { emoji: e.target.value || undefined })}
              className="w-12 text-center"
              aria-label="Emoji"
            />
            <Input value={it.label} onChange={(e) => update(i, { label: e.target.value })} className="flex-1" />
            <button
              type="button"
              onClick={() => patch({ items: element.items.filter((_, idx) => idx !== i) })}
              className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
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
            patch({ items: [...element.items, { id: nanoid(8), label: "New", emoji: "🔲", isTarget: false }] })
          }
        >
          <Plus className="size-3.5" /> Add picture
        </Button>
      </div>
    </>
  );
}

function SideBySideFields({
  element,
  patch,
}: {
  element: SideBySideElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const update = (i: number, p: Partial<SideBySideElement["rounds"][number]>) => {
    patch({ rounds: element.rounds.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
  };
  const side = (i: number, which: "a" | "b", p: Partial<SideBySideElement["rounds"][number]["a"]>) =>
    update(i, { [which]: { ...element.rounds[i][which], ...p } } as Partial<SideBySideElement["rounds"][number]>);

  return (
    <>
      <Field label="Instruction">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Questions</Label>
        <p className="text-[11px] text-muted-foreground">
          Two choices and one question each. Big targets and only two of them, which is what
          reaches a child who cannot yet scan a list.
        </p>
        {element.rounds.map((r, i) => (
          <div key={r.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
            <div className="flex items-center gap-2">
              <Input
                value={r.question}
                onChange={(e) => update(i, { question: e.target.value })}
                placeholder="Question"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => patch({ rounds: element.rounds.filter((_, idx) => idx !== i) })}
                className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {(["a", "b"] as const).map((which) => (
              <div key={which} className="flex items-center gap-2">
                <PairImagePicker
                  src={r[which].imageSrc}
                  onChange={(v) => side(i, which, { imageSrc: v })}
                  label={which === "a" ? "left" : "right"}
                />
                <Input
                  value={r[which].emoji ?? ""}
                  onChange={(e) => side(i, which, { emoji: e.target.value || undefined })}
                  className="w-12 text-center"
                  aria-label={`${which === "a" ? "Left" : "Right"} emoji`}
                />
                <Input
                  value={r[which].label}
                  onChange={(e) => side(i, which, { label: e.target.value })}
                  className="flex-1"
                  aria-label={`${which === "a" ? "Left" : "Right"} label`}
                />
              </div>
            ))}
            <Field label="Correct answer">
              <Select value={r.answer} onValueChange={(v) => update(i, { answer: v as "a" | "b" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Left — {r.a.label}</SelectItem>
                  <SelectItem value="b">Right — {r.b.label}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              rounds: [
                ...element.rounds,
                {
                  id: nanoid(8),
                  question: "Which one?",
                  a: { label: "This", emoji: "🅰️" },
                  b: { label: "That", emoji: "🅱️" },
                  answer: "a" as const,
                },
              ],
            })
          }
        >
          <Plus className="size-3.5" /> Add question
        </Button>
      </div>
    </>
  );
}

function SecretWordFields({
  element,
  patch,
}: {
  element: SecretWordElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Instruction">
        <Textarea value={element.prompt} onChange={(e) => patch({ prompt: e.target.value })} rows={2} />
      </Field>
      <Field label="The secret word">
        <Input value={element.word} onChange={(e) => patch({ word: e.target.value })} />
      </Field>
      <Field label="Clue">
        <Input
          value={element.hint}
          onChange={(e) => patch({ hint: e.target.value })}
          placeholder="It shines in the sky"
        />
      </Field>
      <Field label="Wrong guesses allowed">
        <Input
          type="number"
          min={1}
          max={20}
          value={element.maxWrong}
          onChange={(e) => patch({ maxWrong: Math.max(1, Math.min(20, Number(e.target.value) || 6)) })}
        />
      </Field>
      <p className="text-[11px] text-muted-foreground">
        Running out reveals the word rather than ending the game — the point is to meet the word,
        not to be beaten by it.
      </p>
    </>
  );
}

function ChecklistFields({
  element,
  patch,
}: {
  element: ChecklistElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const setItem = (i: number, value: string) => {
    patch({ items: element.items.map((it, idx) => (idx === i ? value : it)) });
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Tick-box items</Label>
        {element.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={item} onChange={(e) => setItem(i, e.target.value)} className="flex-1" />
            <button
              type="button"
              onClick={() => patch({ items: element.items.filter((_, idx) => idx !== i) })}
              className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patch({ items: [...element.items, "New item"] })}
        >
          <Plus className="size-3.5" /> Add item
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Text size">
          <Input
            type="number"
            value={element.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) || element.fontSize })}
          />
        </Field>
        <Field label="Box size">
          <Input
            type="number"
            value={element.boxSize}
            onChange={(e) => patch({ boxSize: Number(e.target.value) || element.boxSize })}
          />
        </Field>
        <Field label="Line gap">
          <Input
            type="number"
            value={element.lineGap}
            onChange={(e) => patch({ lineGap: Number(e.target.value) || element.lineGap })}
          />
        </Field>
      </div>
      <ColorField label="Colour" value={element.color} onChange={(v) => patch({ color: v })} />
    </>
  );
}

function TableFields({
  element,
  patch,
}: {
  element: TableElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const columns = Math.max(1, ...element.rows.map((r) => r.length));

  const setCell = (r: number, c: number, value: string) => {
    patch({
      rows: element.rows.map((row, ri) =>
        ri === r ? Array.from({ length: columns }, (_, ci) => (ci === c ? value : row[ci] ?? "")) : row,
      ),
    });
  };

  // Every row is normalised to the same width whenever the shape changes, so
  // a ragged rows array can never reach the renderer and leave a hole in the
  // grid where a cell should be.
  const setColumns = (next: number) => {
    if (next < 1) return;
    patch({
      rows: element.rows.map((row) => Array.from({ length: next }, (_, ci) => row[ci] ?? "")),
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Checkbox
          id="table-header"
          checked={element.headerRow}
          onCheckedChange={(v) => patch({ headerRow: Boolean(v) })}
        />
        <Label htmlFor="table-header" className="text-xs font-normal">
          First row is a header
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setColumns(columns - 1)}>
          − Column
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setColumns(columns + 1)}>
          <Plus className="size-3.5" /> Column
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Rows</Label>
        {element.rows.map((row, r) => (
          <div key={r} className="flex items-start gap-1.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {Array.from({ length: columns }, (_, c) => (
                <Input
                  key={c}
                  value={row[c] ?? ""}
                  placeholder={element.headerRow && r === 0 ? `Heading ${c + 1}` : `Cell ${c + 1}`}
                  onChange={(e) => setCell(r, c, e.target.value)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => patch({ rows: element.rows.filter((_, ri) => ri !== r) })}
              disabled={element.rows.length <= 1}
              className="mt-1 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-30"
              aria-label={`Delete row ${r + 1}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patch({ rows: [...element.rows, Array.from({ length: columns }, () => "")] })}
        >
          <Plus className="size-3.5" /> Add row
        </Button>
      </div>

      <Field label="Text size">
        <Input
          type="number"
          value={element.fontSize}
          onChange={(e) => patch({ fontSize: Number(e.target.value) || element.fontSize })}
        />
      </Field>
      <ColorField label="Text colour" value={element.color} onChange={(v) => patch({ color: v })} />
      <ColorField label="Line colour" value={element.borderColor} onChange={(v) => patch({ borderColor: v })} />
    </>
  );
}

// --- Page furniture ---------------------------------------------------------
// Each of these edits a plain, unscored block, so they are short: a couple of
// fields and a colour. Numbers are clamped where a bad value would render
// something absurd (a thousand stars, a number line with sixty ticks) rather
// than trusting the input.

function ArrowFields({ element, patch }: { element: ArrowElement; patch: (p: Partial<CanvasElement>) => void }) {
  return (
    <>
      <Field label="Arrowheads">
        <Select value={element.head} onValueChange={(v) => patch({ head: v as ArrowElement["head"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="end">One end</SelectItem>
            <SelectItem value="both">Both ends</SelectItem>
            <SelectItem value="none">Plain line</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Thickness">
        <Input
          type="number"
          min={1}
          max={20}
          value={element.thickness}
          onChange={(e) => patch({ thickness: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
        />
      </Field>
      <ColorField label="Colour" value={element.color} onChange={(color) => patch({ color })} />
      <p className="text-[11px] text-muted-foreground">
        Rotate the element to angle the arrow — the Rotation field above turns it.
      </p>
    </>
  );
}

function DividerFields({ element, patch }: { element: DividerElement; patch: (p: Partial<CanvasElement>) => void }) {
  return (
    <>
      <Field label="Line style">
        <Select value={element.style} onValueChange={(v) => patch({ style: v as DividerElement["style"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Thickness">
        <Input
          type="number"
          min={1}
          max={12}
          value={element.thickness}
          onChange={(e) => patch({ thickness: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
        />
      </Field>
      <ColorField label="Colour" value={element.color} onChange={(color) => patch({ color })} />
    </>
  );
}

function StickerFields({ element, patch }: { element: StickerElement; patch: (p: Partial<CanvasElement>) => void }) {
  const QUICK = ["⭐", "🎉", "👍", "❤️", "🐶", "🍎", "☀️", "🚗", "⚽", "🎈", "😀", "🙂"];
  return (
    <>
      <Field label="Emoji">
        <Input value={element.emoji} onChange={(e) => patch({ emoji: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-1">
        {QUICK.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => patch({ emoji: e })}
            className="flex size-8 items-center justify-center rounded-md border border-border text-lg hover:bg-muted cursor-pointer"
          >
            {e}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Drag the corner handles to resize it — the sticker fills whatever box you give it.
      </p>
    </>
  );
}

function SpeechBubbleFields({
  element,
  patch,
}: {
  element: SpeechBubbleElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="What it says">
        <Textarea value={element.text} onChange={(e) => patch({ text: e.target.value })} rows={3} />
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox
          id="bubble-thought"
          checked={element.thought}
          onCheckedChange={(v) => patch({ thought: Boolean(v) })}
        />
        <Label htmlFor="bubble-thought" className="text-xs font-normal">
          Thought bubble (a cloud, not speech)
        </Label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tail">
          <Select value={element.tail} onValueChange={(v) => patch({ tail: v as SpeechBubbleElement["tail"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Text size">
          <Input
            type="number"
            min={8}
            max={48}
            value={element.fontSize}
            onChange={(e) => patch({ fontSize: Math.max(8, Number(e.target.value) || 18) })}
          />
        </Field>
      </div>
      <ColorField label="Bubble colour" value={element.fill} onChange={(fill) => patch({ fill })} />
      <ColorField label="Text colour" value={element.color} onChange={(color) => patch({ color })} />
    </>
  );
}

function CalloutFields({ element, patch }: { element: CalloutElement; patch: (p: Partial<CanvasElement>) => void }) {
  return (
    <>
      <Field label="Heading">
        <Input value={element.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <Field label="Note">
        <Textarea value={element.body} onChange={(e) => patch({ body: e.target.value })} rows={3} />
      </Field>
      <Field label="Tone">
        <Select value={element.tone} onValueChange={(v) => patch({ tone: v as CalloutElement["tone"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="note">Note (violet)</SelectItem>
            <SelectItem value="tip">Tip (green)</SelectItem>
            <SelectItem value="warning">Watch out (amber)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Text size">
        <Input
          type="number"
          min={8}
          max={32}
          value={element.fontSize}
          onChange={(e) => patch({ fontSize: Math.max(8, Number(e.target.value) || 15) })}
        />
      </Field>
      <p className="text-[11px] text-muted-foreground">
        Tinted on purpose, so a child can see at a glance which words on the page are not for them.
      </p>
    </>
  );
}

function SheetHeaderFields({
  element,
  patch,
}: {
  element: SheetHeaderElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  const setField = (i: number, value: string) =>
    patch({ fields: element.fields.map((f, idx) => (idx === i ? value : f)) });

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Fields</Label>
        {element.fields.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={f} onChange={(e) => setField(i, e.target.value)} className="flex-1" />
            <button
              type="button"
              onClick={() => patch({ fields: element.fields.filter((_, idx) => idx !== i) })}
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
          onClick={() => patch({ fields: [...element.fields, "Field"] })}
        >
          <Plus className="size-3.5" /> Add field
        </Button>
      </div>
      <Field label="Text size">
        <Input
          type="number"
          min={8}
          max={32}
          value={element.fontSize}
          onChange={(e) => patch({ fontSize: Math.max(8, Number(e.target.value) || 16) })}
        />
      </Field>
      <ColorField label="Colour" value={element.color} onChange={(color) => patch({ color })} />
    </>
  );
}

function LetterBoxesFields({
  element,
  patch,
}: {
  element: LetterBoxesElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Word">
        <Input value={element.word} onChange={(e) => patch({ word: e.target.value })} />
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox
          id="lb-show"
          checked={element.showLetters}
          onCheckedChange={(v) => patch({ showLetters: Boolean(v) })}
        />
        <Label htmlFor="lb-show" className="text-xs font-normal">
          Print the letters faintly, for tracing
        </Label>
      </div>
      <Field label="Box size">
        <Input
          type="number"
          min={16}
          max={120}
          value={element.boxSize}
          onChange={(e) => patch({ boxSize: Math.max(16, Math.min(120, Number(e.target.value) || 44)) })}
        />
      </Field>
      <ColorField label="Colour" value={element.color} onChange={(color) => patch({ color })} />
      <p className="text-[11px] text-muted-foreground">
        A space in the word becomes a gap between words rather than a box to write in.
      </p>
    </>
  );
}

function NumberLineFields({
  element,
  patch,
}: {
  element: NumberLineElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Field label="From">
          <Input
            type="number"
            value={element.from}
            onChange={(e) => patch({ from: Math.round(Number(e.target.value) || 0) })}
          />
        </Field>
        <Field label="To">
          <Input
            type="number"
            value={element.to}
            onChange={(e) => patch({ to: Math.round(Number(e.target.value) || 10) })}
          />
        </Field>
        <Field label="Step">
          <Input
            type="number"
            min={1}
            value={element.step}
            onChange={(e) => patch({ step: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
          />
        </Field>
      </div>
      <Field label="Text size">
        <Input
          type="number"
          min={8}
          max={28}
          value={element.fontSize}
          onChange={(e) => patch({ fontSize: Math.max(8, Number(e.target.value) || 14) })}
        />
      </Field>
      <ColorField label="Colour" value={element.color} onChange={(color) => patch({ color })} />
      <p className="text-[11px] text-muted-foreground">
        Capped at 60 marks, so a small step over a wide range stays readable.
      </p>
    </>
  );
}

function RewardStarsFields({
  element,
  patch,
}: {
  element: RewardStarsElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Label">
        <Input value={element.label} onChange={(e) => patch({ label: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Stars">
          <Input
            type="number"
            min={1}
            max={30}
            value={element.total}
            onChange={(e) => patch({ total: Math.max(1, Math.min(30, Number(e.target.value) || 5)) })}
          />
        </Field>
        <Field label="Already earned">
          <Input
            type="number"
            min={0}
            max={element.total}
            value={element.earned}
            onChange={(e) => patch({ earned: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
      </div>
      <ColorField label="Colour" value={element.color} onChange={(color) => patch({ color })} />
      <p className="text-[11px] text-muted-foreground">
        Earned stars are filled in; the rest print as outlines for the child to colour.
      </p>
    </>
  );
}

function WordBankFields({
  element,
  patch,
}: {
  element: WordBankElement;
  patch: (p: Partial<CanvasElement>) => void;
}) {
  return (
    <>
      <Field label="Heading">
        <Input value={element.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <Field label="Words (one per line)">
        <Textarea
          value={element.words.join("\n")}
          onChange={(e) =>
            patch({ words: e.target.value.split("\n").map((w) => w.trim()).filter(Boolean) })
          }
          rows={5}
        />
      </Field>
      <Field label="Text size">
        <Input
          type="number"
          min={8}
          max={32}
          value={element.fontSize}
          onChange={(e) => patch({ fontSize: Math.max(8, Number(e.target.value) || 17) })}
        />
      </Field>
      <ColorField label="Text colour" value={element.color} onChange={(color) => patch({ color })} />
      <ColorField label="Border colour" value={element.borderColor} onChange={(borderColor) => patch({ borderColor })} />
    </>
  );
}
