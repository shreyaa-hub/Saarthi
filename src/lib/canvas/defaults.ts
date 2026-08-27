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
  SortCategorizeElement,
  MemoryMatchElement,
  WordHuntElement,
  ImageHotspotsElement,
  PracticeDrillElement,
  ListElement,
  WritingLinesElement,
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
        // Literals, not theme tokens: this value is written into the stored
        // canvas the moment a shape is added, so it must be a real colour.
        // Changing it restyles shapes added from now on and deliberately
        // leaves every already-authored activity exactly as its author left it.
        fill: "#ede9fe",
        stroke: "#7c3aed",
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

    case "sortCategorize": {
      const animals = id();
      const food = id();
      return {
        ...base,
        type: "sortCategorize",
        w: 420,
        h: 280,
        prompt: "Sort each word into the right category.",
        categories: [
          { id: animals, label: "Animals" },
          { id: food, label: "Food" },
        ],
        items: [
          { id: id(), label: "Dog", categoryId: animals },
          { id: id(), label: "Apple", categoryId: food },
          { id: id(), label: "Cat", categoryId: animals },
          { id: id(), label: "Banana", categoryId: food },
        ],
      } satisfies SortCategorizeElement;
    }

    case "memoryMatch":
      return {
        ...base,
        type: "memoryMatch",
        w: 420,
        h: 320,
        prompt: "Find every matching pair.",
        pairs: [
          { id: id(), label: "🐶 Dog" },
          { id: id(), label: "🐱 Cat" },
          { id: id(), label: "🐦 Bird" },
        ],
      } satisfies MemoryMatchElement;

    case "wordHunt":
      return {
        ...base,
        type: "wordHunt",
        w: 460,
        h: 240,
        prompt: "Tap every word that starts with the /s/ sound.",
        passage:
          "The sun was so bright that Sam put on his sunglasses before he sat on the soft grass.",
        targetWords: ["sun", "so", "Sam", "sunglasses", "sat", "soft"],
      } satisfies WordHuntElement;

    case "imageHotspots":
      return {
        ...base,
        type: "imageHotspots",
        w: 460,
        h: 340,
        prompt: "Find and tap each thing in the picture.",
        src: "",
        alt: "",
        showOutlines: false,
        fit: "contain",
        // Exactly one starter target, not two. Two arrived named "First
        // thing" and "Second thing", which told a clinician nothing about
        // what to do and read as gibberish to the patient if left unrenamed.
        // One target is enough to show what a target IS and to drag onto the
        // picture, and it is never zero — an element with no targets would
        // score as complete without the patient doing anything.
        hotspots: [{ id: id(), label: "Target 1", xPct: 35, yPct: 35, wPct: 25, hPct: 25 }],
      } satisfies ImageHotspotsElement;

    case "practiceDrill":
      return {
        ...base,
        type: "practiceDrill",
        w: 420,
        h: 300,
        prompt: "Say each word five times. Tap once for every try.",
        words: [
          { id: id(), label: "Sun", target: 5 },
          { id: id(), label: "Soap", target: 5 },
          { id: id(), label: "Sock", target: 5 },
        ],
      } satisfies PracticeDrillElement;

    case "list":
      return {
        ...base,
        type: "list",
        w: 420,
        h: 160,
        ordered: false,
        items: ["First point", "Second point", "Third point"],
        fontSize: 18,
        color: "#2a2420",
        lineGap: 12,
      } satisfies ListElement;

    case "writingLines":
      return {
        ...base,
        type: "writingLines",
        w: 620,
        h: 180,
        lines: 5,
        lineGap: 36,
        color: "#c9bfae",
        guide: "single",
      } satisfies WritingLinesElement;

    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown element type: ${_exhaustive}`);
    }
  }
}

// `surfaces` is what keeps the worksheet workspace honest. A worksheet is
// printed and filled in on paper, so anything that only means something on a
// screen — audio, buttons, and every scored interactive type — is not offered
// there at all. Filtering the palette rather than maintaining a second
// element library means a new element type cannot silently appear in the
// wrong workspace: it has to declare where it belongs.
export type ElementSurface = "activity" | "worksheet";

export const ELEMENT_LIBRARY: {
  type: CanvasElementType;
  label: string;
  group: "content" | "interactive" | "worksheet";
  surfaces: ElementSurface[];
}[] = [
  { type: "text", label: "Text", group: "content", surfaces: ["activity", "worksheet"] },
  { type: "image", label: "Image", group: "content", surfaces: ["activity", "worksheet"] },
  { type: "shape", label: "Shape", group: "content", surfaces: ["activity", "worksheet"] },
  { type: "audio", label: "Audio", group: "content", surfaces: ["activity"] },
  { type: "button", label: "Button", group: "content", surfaces: ["activity"] },
  { type: "list", label: "List", group: "worksheet", surfaces: ["activity", "worksheet"] },
  { type: "writingLines", label: "Writing lines", group: "worksheet", surfaces: ["worksheet"] },
  { type: "multipleChoice", label: "Multiple choice", group: "interactive", surfaces: ["activity"] },
  { type: "fillBlank", label: "Fill in the blank", group: "interactive", surfaces: ["activity"] },
  { type: "dragMatch", label: "Drag to match", group: "interactive", surfaces: ["activity"] },
  { type: "sequence", label: "Sequencing", group: "interactive", surfaces: ["activity"] },
  { type: "sortCategorize", label: "Sort into categories", group: "interactive", surfaces: ["activity"] },
  { type: "memoryMatch", label: "Memory match", group: "interactive", surfaces: ["activity"] },
  { type: "wordHunt", label: "Word hunt", group: "interactive", surfaces: ["activity"] },
  { type: "imageHotspots", label: "Find in picture", group: "interactive", surfaces: ["activity"] },
  { type: "practiceDrill", label: "Practice drill", group: "interactive", surfaces: ["activity"] },
];

export function elementsForSurface(surface: ElementSurface) {
  return ELEMENT_LIBRARY.filter((e) => e.surfaces.includes(surface));
}
