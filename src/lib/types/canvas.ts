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

export type MultipleChoiceOption = {
  id: string;
  label: string;
  imageSrc?: string;
  correct: boolean;
};

export type MultipleChoiceElement = ElementBase & {
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
};

export type DragMatchElement = ElementBase & {
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
  | ListElement
  | WritingLinesElement;

export type CanvasElementType = CanvasElement["type"];

export const INTERACTIVE_TYPES: CanvasElementType[] = [
  "multipleChoice",
  "fillBlank",
  "dragMatch",
  "sequence",
];

export function isInteractive(el: CanvasElement): boolean {
  return INTERACTIVE_TYPES.includes(el.type);
}

// Whether the page itself carries a ruling behind the elements. Optional so
// every canvas authored before worksheets existed still parses — absent means
// "blank", which is what those canvases already rendered as.
export const PAGE_STYLES = ["blank", "ruled", "grid", "dotted"] as const;
export type PageStyle = (typeof PAGE_STYLES)[number];

export type TemplateCanvas = {
  width: number;
  height: number;
  background: string;
  elements: CanvasElement[];
  pageStyle?: PageStyle;
};

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
