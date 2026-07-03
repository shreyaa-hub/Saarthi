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

export type CanvasElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | AudioElement
  | ButtonElement
  | MultipleChoiceElement
  | FillBlankElement
  | DragMatchElement
  | SequenceElement;

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

export type TemplateCanvas = {
  width: number;
  height: number;
  background: string;
  elements: CanvasElement[];
};

export const EMPTY_CANVAS: TemplateCanvas = {
  width: 900,
  height: 600,
  background: "#ffffff",
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
