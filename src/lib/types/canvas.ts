// Canvas document schema for authored therapy activities.
// Stored verbatim in templates.canvas / assignments.canvas_snapshot (jsonb).

export type ElementBase = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  locked?: boolean;
};

export type TextElement = ElementBase & {
  type: "text";
  content: string;
  fontSize: number;
  fontWeight: "normal" | "medium" | "bold";
  color: string;
  align: "left" | "center" | "right";
  // Optional so every canvas authored before these existed still parses and
  // renders identically — absent means off.
  italic?: boolean;
  underline?: boolean;
};

export type ImageElement = ElementBase & {
  type: "image";
  src: string;
  alt: string;
  objectFit: "cover" | "contain";
  radius: number;
};

export type ShapeElement = ElementBase & {
  type: "shape";
  shape: "rectangle" | "circle" | "star" | "speech-bubble";
  fill: string;
  stroke: string;
  strokeWidth: number;
};

export type AudioElement = ElementBase & {
  type: "audio";
  src: string;
  label: string;
};

export type ButtonElement = ElementBase & {
  type: "button";
  label: string;
  action: "next" | "submit" | "restart";
  style: "primary" | "secondary" | "accent";
};

// Presentation controls shared by every interactive type that draws cards or
// chips of authored content. All optional, and every consumer falls back to
// the same defaults below, so an element authored before these existed
// renders byte-identically to how it always did.
//
// Deliberately per-element rather than global: one activity can hold a
// picture-matching task that wants big thumbnails next to a word-sorting
// task that wants none, and a document-wide setting could not serve both.
export type InteractiveAppearance = {
  fontSize?: number;
  textColor?: string;
  cardColor?: string;
  imageSize?: number;
};

export const APPEARANCE_DEFAULTS = {
  fontSize: 14,
  imageSize: 28,
} as const;

export type MultipleChoiceOption = {
  id: string;
  label: string;
  imageSrc?: string;
  correct: boolean;
};

export type MultipleChoiceElement = ElementBase & InteractiveAppearance & {
  type: "multipleChoice";
  prompt: string;
  options: MultipleChoiceOption[];
  allowMultiple: boolean;
};

export type FillBlankElement = ElementBase & {
  type: "fillBlank";
  template: string; // use "___" to mark the blank
  answer: string;
  caseSensitive: boolean;
};

export type MatchPair = {
  id: string;
  left: string;
  right: string;
  // Optional photo for either side, independent of the other — a clinician
  // can build a picture-to-word pair (leftImage set, right plain text), a
  // picture-to-picture pair (both set), or leave both unset for the
  // text-only pair this type has always supported. Never required, so
  // every dragMatch element authored before this still parses unchanged.
  leftImage?: string;
  rightImage?: string;
};

export type DragMatchElement = ElementBase & InteractiveAppearance & {
  type: "dragMatch";
  prompt: string;
  pairs: MatchPair[];
};

export type SequenceItem = {
  id: string;
  label: string;
  order: number;
};

export type SequenceElement = ElementBase & {
  type: "sequence";
  prompt: string;
  items: SequenceItem[];
};

export type SortCategory = {
  id: string;
  label: string;
};

// categoryId is the correct bucket for this item — the answer key, not the
// patient's placement. The patient's in-progress placement lives entirely in
// the attempt response (itemId -> categoryId), same split as DragMatchElement
// (pairs = the key, the response = what the patient did).
export type SortItem = {
  id: string;
  label: string;
  categoryId: string;
  image?: string;
};

export type SortCategorizeElement = ElementBase & InteractiveAppearance & {
  type: "sortCategorize";
  prompt: string;
  categories: SortCategory[];
  items: SortItem[];
};

// Authoring data only — each pair becomes exactly two face-down cards at
// play time (ids `${id}-a` / `${id}-b`, shuffled together), not stored as
// individual cards here. A clinician thinks in terms of "the six things to
// find pairs of," not "twelve cards, coincidentally in matching pairs."
export type MemoryPair = {
  id: string;
  label: string;
  image?: string;
};

export type MemoryMatchElement = ElementBase & InteractiveAppearance & {
  type: "memoryMatch";
  prompt: string;
  pairs: MemoryPair[];
};

export type WordHuntElement = ElementBase & {
  type: "wordHunt";
  prompt: string;
  passage: string;
  // Matched case-insensitively against the passage (see lib/canvas/word-hunt.ts).
  targetWords: string[];
};

// --- Worksheet elements -----------------------------------------------------
// Print-first building blocks. They carry no answer key and are never scored,
// which is what separates them from the interactive types above: a worksheet
// is filled in on paper, so the app has nothing to mark.

export type ListElement = ElementBase & {
  type: "list";
  ordered: boolean; // numbered when true, bulleted when false
  items: string[];
  fontSize: number;
  color: string;
  lineGap: number;
};

// Ruled lines for handwriting practice. Rendered as real lines rather than a
// background image so they stay crisp at any zoom and in print.
export type WritingLinesElement = ElementBase & {
  type: "writingLines";
  lines: number;
  lineGap: number;
  color: string;
  guide: "single" | "dotted-midline"; // dotted-midline = handwriting practice ruling
};

export type CanvasElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | AudioElement
  | ButtonElement
  | MultipleChoiceElement
  | FillBlankElement
  | DragMatchElement
  | SequenceElement
  | SortCategorizeElement
  | MemoryMatchElement
  | WordHuntElement
  | ListElement
  | WritingLinesElement;

export type CanvasElementType = CanvasElement["type"];

export const INTERACTIVE_TYPES: CanvasElementType[] = [
  "multipleChoice",
  "fillBlank",
  "dragMatch",
  "sequence",
  "sortCategorize",
  "memoryMatch",
  "wordHunt",
];

export function isInteractive(el: CanvasElement): boolean {
  return INTERACTIVE_TYPES.includes(el.type);
}

// Whether the page itself carries a ruling behind the elements. Optional so
// every canvas authored before worksheets existed still parses — absent means
// "blank", which is what those canvases already rendered as.
export const PAGE_STYLES = ["blank", "ruled", "ruled-margin", "grid", "dotted"] as const;
export type PageStyle = (typeof PAGE_STYLES)[number];

// Additional pages, 2..n. Page 1 stays in `elements`/`pageStyle` above, so
// every existing reader — the activity player, scoring, the printable report,
// the blueprints — keeps working untouched and simply sees the first page.
// Absent means a single-page document, which is what every canvas authored
// before multi-page was added is.
export type CanvasPage = {
  id: string;
  pageStyle: PageStyle;
  elements: CanvasElement[];
};

export type TemplateCanvas = {
  width: number;
  height: number;
  background: string;
  elements: CanvasElement[];
  pageStyle?: PageStyle;
  pages?: CanvasPage[];
};

// The whole document as a flat list of pages, page 1 first. The one place
// that knows how page 1 is stored differently from the rest, so nothing else
// has to remember.
export function allPages(canvas: TemplateCanvas): CanvasPage[] {
  return [
    { id: "page-1", pageStyle: canvas.pageStyle ?? "blank", elements: canvas.elements },
    ...(canvas.pages ?? []),
  ];
}

export const EMPTY_CANVAS: TemplateCanvas = {
  width: 900,
  height: 600,
  background: "#ffffff",
  elements: [],
};

// A4 at 96dpi in portrait — worksheets are authored at the size they print at,
// so what the author lays out is what comes out of the printer.
export const EMPTY_WORKSHEET_CANVAS: TemplateCanvas = {
  width: 794,
  height: 1123,
  background: "#ffffff",
  pageStyle: "blank",
  elements: [],
};

export const TEMPLATE_DOMAINS = [
  "Articulation",
  "Language",
  "Fluency",
  "Social / Pragmatics",
  "Cognitive",
  "OT / Fine Motor",
  "Behavioral",
  "General",
] as const;

export type TemplateDomain = (typeof TEMPLATE_DOMAINS)[number];

export const TEMPLATE_MEDIUMS = ["interactive", "hybrid", "print"] as const;
export type TemplateMedium = (typeof TEMPLATE_MEDIUMS)[number];
