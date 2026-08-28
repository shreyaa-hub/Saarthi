"use client";

import { useState } from "react";
import {
  Shapes,
  Type,
  Upload,
  Layers,
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
  LayoutGrid,
  Brain,
  SearchCheck,
  ScanSearch,
  Repeat2,
  Pencil,
  AlignLeft,
  ThumbsUp,
  Layers2,
  Hash,
  Grid2x2,
  Shuffle,
  Blocks,
  Images,
  Columns2,
  KeyRound,
  MoveRight,
  Minus,
  Smile,
  MessageCircle,
  Info,
  FileSignature,
  Grid3x3,
  Ruler,
  Star,
  BookOpen,
  ListChecks as ChecklistIcon,
  Table2,
} from "lucide-react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import { createElement, elementsForSurface, type ElementSurface } from "@/lib/canvas/defaults";
import { ELEMENT_DND_TYPE } from "@/lib/canvas/dnd";
import type { CanvasElementType, TextElement } from "@/lib/types/canvas";
import { TEXT_PRESETS } from "./text-presets";
import { LayersPanel } from "./layers-panel";
import { ImageUploadButton } from "./image-upload-button";
import { useEditorMode } from "./editor-mode";
import { cn } from "@/lib/utils";

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
  sortCategorize: LayoutGrid,
  memoryMatch: Brain,
  wordHunt: SearchCheck,
  imageHotspots: ScanSearch,
  practiceDrill: Repeat2,
  drawPad: Pencil,
  longAnswer: AlignLeft,
  yesNo: ThumbsUp,
  flashcards: Layers2,
  countTap: Hash,
  wordSearch: Grid2x2,
  unscramble: Shuffle,
  wordChunks: Blocks,
  photoHunt: Images,
  sideBySide: Columns2,
  secretWord: KeyRound,
  list: List,
  writingLines: Baseline,
  checklist: ChecklistIcon,
  table: Table2,
  arrow: MoveRight,
  divider: Minus,
  sticker: Smile,
  speechBubble: MessageCircle,
  callout: Info,
  sheetHeader: FileSignature,
  letterBoxes: Grid3x3,
  numberLine: Ruler,
  rewardStars: Star,
  wordBank: BookOpen,
};

const GROUP_LABELS: Record<string, string> = {
  content: "Content",
  worksheet: "Worksheet",
  interactive: "Interactive",
};
const GROUP_ORDER = ["content", "worksheet", "interactive"] as const;

type TabId = "elements" | "text" | "uploads" | "layers";

const TABS: { id: TabId; label: string; icon: typeof Shapes }[] = [
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "text", label: "Text", icon: Type },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "layers", label: "Layers", icon: Layers },
];

// A Canva-style two-part sidebar: a narrow icon rail that always shows where
// you are, and one open panel beside it. Replaces the old flat scrolling
// palette without changing what any of the tools do — adding an element still
// goes through createElement + addElement exactly as before, so undo/redo,
// snapping, autosave and everything downstream are untouched.
export function EditorSidebar({
  store,
  surface = "activity",
}: {
  store: CanvasStoreApi;
  surface?: ElementSurface;
}) {
  const [tab, setTab] = useState<TabId>("elements");
  const { guest } = useEditorMode();
  const width = useCanvasStore(store, (s) => s.width);
  const height = useCanvasStore(store, (s) => s.height);
  const elementCount = useCanvasStore(store, (s) => s.elements.length);

  // Click-to-add keeps the original cascade placement, so the existing
  // behaviour is intact for anyone who never discovers dragging.
  const addAtCentre = (type: CanvasElementType, patch?: Partial<TextElement>) => {
    const el = createElement(
      type,
      width / 2 - 100 + (elementCount % 6) * 16,
      height / 2 - 80 + (elementCount % 6) * 16,
    );
    const next = patch ? ({ ...el, ...patch } as typeof el) : el;
    store.getState().addElement(next);
    store.getState().select(next.id);
  };

  const startDrag = (type: CanvasElementType) => (e: React.DragEvent) => {
    e.dataTransfer.setData(ELEMENT_DND_TYPE, type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const available = elementsForSurface(surface);
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: available.filter((e) => e.group === group),
  })).filter((g) => g.items.length > 0);

  const textAvailable = available.some((e) => e.type === "text");
  const imageAvailable = available.some((e) => e.type === "image");
  const visibleTabs = TABS.filter((t) => {
    if (t.id === "text") return textAvailable;
    if (t.id === "uploads") return imageAvailable;
    return true;
  });

  return (
    <div className="hidden shrink-0 md:flex">
      <nav
        className="flex w-16 flex-col gap-1 border-r border-border bg-card p-2"
        aria-label="Editor tools"
      >
        {visibleTabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors cursor-pointer",
                active
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="w-60 overflow-y-auto border-r border-border bg-card p-3">
        {tab === "elements" && (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-muted-foreground">Click to add, or drag onto the page.</p>
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
                        draggable
                        onDragStart={startDrag(item.type)}
                        onClick={() => addAtCentre(item.type)}
                        className="flex cursor-grab flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-center text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-secondary hover:shadow-sm active:cursor-grabbing"
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "text" && (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-xs text-muted-foreground">Click to add, or drag onto the page.</p>
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                draggable
                onDragStart={startDrag("text")}
                onClick={() => addAtCentre("text", preset.patch)}
                className="flex cursor-grab flex-col items-start gap-1 rounded-xl border border-border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-secondary hover:shadow-sm active:cursor-grabbing"
              >
                <span
                  className="truncate leading-tight"
                  style={{
                    fontSize: preset.previewSize,
                    fontWeight: preset.patch.fontWeight === "bold" ? 700 : preset.patch.fontWeight === "medium" ? 500 : 400,
                  }}
                >
                  {preset.preview}
                </span>
                <span className="text-[10px] text-muted-foreground">{preset.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "uploads" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {guest
                ? "Add an image element, then paste an image address into its Image URL field. Uploading your own pictures needs a free account."
                : "Add an image element, then upload a picture into it from the properties panel."}
            </p>
            <button
              type="button"
              draggable
              onDragStart={startDrag("image")}
              onClick={() => addAtCentre("image")}
              className="flex cursor-grab flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-xs font-medium text-muted-foreground transition-all hover:border-primary hover:bg-secondary hover:text-foreground active:cursor-grabbing"
            >
              <ImageIcon className="size-5" />
              Add an image
            </button>
            <ImageUploadHint store={store} />
          </div>
        )}

        {tab === "layers" && <LayersPanel store={store} />}
      </div>
    </div>
  );
}

// Uploading writes into whichever image element is selected, so this only
// appears when one is — otherwise the upload would have nowhere to land.
function ImageUploadHint({ store }: { store: CanvasStoreApi }) {
  const elements = useCanvasStore(store, (s) => s.elements);
  const selectedIds = useCanvasStore(store, (s) => s.selectedIds);
  const selected = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) : null;

  if (!selected || selected.type !== "image") return null;

  return (
    <ImageUploadButton
      onUploaded={(url) => store.getState().updateElement(selected.id, { src: url })}
    />
  );
}
