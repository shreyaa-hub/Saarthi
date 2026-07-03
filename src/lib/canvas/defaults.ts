import { nanoid } from "nanoid";
import type {
  CanvasElement,
  CanvasElementType,
  TextElement,
  ImageElement,
  ShapeElement,
  AudioElement,
  ButtonElement,
  MultipleChoiceElement,
  FillBlankElement,
  DragMatchElement,
  SequenceElement,
} from "@/lib/types/canvas";

const id = () => nanoid(8);

export function createElement(type: CanvasElementType, x: number, y: number): CanvasElement {
  const base = { id: id(), x, y, rotation: 0 };

  switch (type) {
    case "text":
      return {
        ...base,
        type: "text",
        w: 260,
        h: 60,
        content: "Add your text",
        fontSize: 20,
        fontWeight: "medium",
        color: "#2a2420",
        align: "left",
      } satisfies TextElement;

    case "image":
      return {
        ...base,
        type: "image",
        w: 220,
        h: 220,
        src: "",
        alt: "",
        objectFit: "cover",
        radius: 12,
      } satisfies ImageElement;

    case "shape":
      return {
        ...base,
        type: "shape",
        w: 160,
        h: 160,
        shape: "rectangle",
        fill: "#eeeae0",
        stroke: "#3b5544",
        strokeWidth: 2,
      } satisfies ShapeElement;

    case "audio":
      return {
        ...base,
        type: "audio",
        w: 280,
        h: 64,
        src: "",
        label: "Listen",
      } satisfies AudioElement;

    case "button":
      return {
        ...base,
        type: "button",
        w: 160,
        h: 48,
        label: "Next",
        action: "next",
        style: "primary",
      } satisfies ButtonElement;

    case "multipleChoice":
      return {
        ...base,
        type: "multipleChoice",
        w: 360,
        h: 240,
        prompt: "Which one is correct?",
        allowMultiple: false,
        options: [
          { id: id(), label: "Option A", correct: true },
          { id: id(), label: "Option B", correct: false },
          { id: id(), label: "Option C", correct: false },
        ],
      } satisfies MultipleChoiceElement;

    case "fillBlank":
      return {
        ...base,
        type: "fillBlank",
        w: 360,
        h: 100,
        template: "The cat is ___ the box.",
        answer: "in",
        caseSensitive: false,
      } satisfies FillBlankElement;

    case "dragMatch":
      return {
        ...base,
        type: "dragMatch",
        w: 380,
        h: 260,
        prompt: "Match each word to its picture.",
        pairs: [
          { id: id(), left: "Dog", right: "🐶" },
          { id: id(), left: "Cat", right: "🐱" },
          { id: id(), left: "Bird", right: "🐦" },
        ],
      } satisfies DragMatchElement;

    case "sequence":
      return {
        ...base,
        type: "sequence",
        w: 360,
        h: 220,
        prompt: "Put the steps in order.",
        items: [
          { id: id(), label: "Wake up", order: 1 },
          { id: id(), label: "Brush teeth", order: 2 },
          { id: id(), label: "Eat breakfast", order: 3 },
        ],
      } satisfies SequenceElement;

    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown element type: ${_exhaustive}`);
    }
  }
}

export const ELEMENT_LIBRARY: { type: CanvasElementType; label: string; group: "content" | "interactive" }[] = [
  { type: "text", label: "Text", group: "content" },
  { type: "image", label: "Image", group: "content" },
  { type: "shape", label: "Shape", group: "content" },
  { type: "audio", label: "Audio", group: "content" },
  { type: "button", label: "Button", group: "content" },
  { type: "multipleChoice", label: "Multiple choice", group: "interactive" },
  { type: "fillBlank", label: "Fill in the blank", group: "interactive" },
  { type: "dragMatch", label: "Drag to match", group: "interactive" },
  { type: "sequence", label: "Sequencing", group: "interactive" },
];
