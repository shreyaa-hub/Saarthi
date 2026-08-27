import { describe, it, expect } from "vitest";
import { isElementCorrect, scoreCanvas } from "@/lib/scoring";
import type {
  MultipleChoiceElement,
  FillBlankElement,
  DragMatchElement,
  SequenceElement,
  SortCategorizeElement,
  MemoryMatchElement,
  WordHuntElement,
  TextElement,
  TemplateCanvas,
} from "@/lib/types/canvas";

// isElementCorrect had no coverage at all before this file — every one of
// these interactive types is scored per-attempt, so a regression here would
// silently mark a patient's correct answer wrong (or a wrong one correct)
// with nothing to catch it. Written against the real element shapes rather
// than mocks, since the whole risk is in how each type's response shape
// (an array, a string, a Record) gets compared to its answer key.

const base = { id: "el1", x: 0, y: 0, w: 100, h: 100 };

describe("isElementCorrect: multipleChoice", () => {
  const el: MultipleChoiceElement = {
    ...base,
    type: "multipleChoice",
    prompt: "Pick one",
    allowMultiple: false,
    options: [
      { id: "a", label: "A", correct: true },
      { id: "b", label: "B", correct: false },
    ],
  };

  it("is correct when the exact correct set is selected", () => {
    expect(isElementCorrect(el, ["a"])).toBe(true);
  });

  it("is wrong for the wrong option", () => {
    expect(isElementCorrect(el, ["b"])).toBe(false);
  });

  it("is wrong for no response", () => {
    expect(isElementCorrect(el, undefined)).toBe(false);
  });

  it("rejects selecting more than the correct set even if it includes the right answer", () => {
    expect(isElementCorrect(el, ["a", "b"])).toBe(false);
  });
});

describe("isElementCorrect: fillBlank", () => {
  const el: FillBlankElement = {
    ...base,
    type: "fillBlank",
    template: "The cat is ___ the box.",
    answer: "In",
    caseSensitive: false,
  };

  it("matches ignoring case when caseSensitive is false", () => {
    expect(isElementCorrect(el, "in")).toBe(true);
    expect(isElementCorrect(el, "IN")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isElementCorrect(el, "  in  ")).toBe(true);
  });

  it("respects caseSensitive: true", () => {
    const strict = { ...el, caseSensitive: true };
    expect(isElementCorrect(strict, "in")).toBe(false);
    expect(isElementCorrect(strict, "In")).toBe(true);
  });
});

describe("isElementCorrect: dragMatch", () => {
  const el: DragMatchElement = {
    ...base,
    type: "dragMatch",
    prompt: "Match",
    pairs: [
      { id: "p1", left: "Dog", right: "🐶" },
      { id: "p2", left: "Cat", right: "🐱" },
    ],
  };

  it("is correct only when every pair maps to itself", () => {
    expect(isElementCorrect(el, { p1: "p1", p2: "p2" })).toBe(true);
  });

  it("is wrong when pairs are swapped", () => {
    expect(isElementCorrect(el, { p1: "p2", p2: "p1" })).toBe(false);
  });

  it("is wrong when incomplete", () => {
    expect(isElementCorrect(el, { p1: "p1" })).toBe(false);
  });

  it("treats a missing response as no matches made", () => {
    expect(isElementCorrect(el, null)).toBe(false);
  });

  it("scores by pair id, so shuffling the displayed right column is safe", () => {
    // The player renders the right-hand options in a shuffled order (they
    // used to render in the same order as the left, making every answer
    // "row 1 to row 1"). Correctness is a pair-id comparison, so the same
    // response scores identically no matter what order the element's own
    // pairs array happens to be in.
    const reordered: DragMatchElement = {
      ...el,
      pairs: [
        { id: "p2", left: "Cat", right: "🐱" },
        { id: "p1", left: "Dog", right: "🐶" },
      ],
    };
    expect(isElementCorrect(reordered, { p1: "p1", p2: "p2" })).toBe(true);
    expect(isElementCorrect(reordered, { p1: "p2", p2: "p1" })).toBe(false);
  });

  it("scores the same way whether or not a pair carries a photo", () => {
    const withPhotos: DragMatchElement = {
      ...el,
      pairs: [
        { id: "p1", left: "Dog", right: "🐶", leftImage: "https://example.com/dog.png" },
        { id: "p2", left: "Cat", right: "🐱", rightImage: "https://example.com/cat.png" },
      ],
    };
    expect(isElementCorrect(withPhotos, { p1: "p1", p2: "p2" })).toBe(true);
    expect(isElementCorrect(withPhotos, { p1: "p2", p2: "p1" })).toBe(false);
  });
});

describe("isElementCorrect: sequence", () => {
  const el: SequenceElement = {
    ...base,
    type: "sequence",
    prompt: "Order these",
    items: [
      { id: "s1", label: "First", order: 1 },
      { id: "s2", label: "Second", order: 2 },
      { id: "s3", label: "Third", order: 3 },
    ],
  };

  it("is correct only in exact order", () => {
    expect(isElementCorrect(el, ["s1", "s2", "s3"])).toBe(true);
  });

  it("is wrong out of order", () => {
    expect(isElementCorrect(el, ["s2", "s1", "s3"])).toBe(false);
  });

  it("scores by the authored `order` field, not the array order", () => {
    // The player shuffles what the patient sees (otherwise the steps appear
    // already sorted and the task is just "tap top to bottom"). Correctness
    // has to come from `order`, so that an element whose items array is in a
    // different sequence still scores identically.
    const jumbled: SequenceElement = {
      ...el,
      items: [
        { id: "s3", label: "Third", order: 3 },
        { id: "s1", label: "First", order: 1 },
        { id: "s2", label: "Second", order: 2 },
      ],
    };
    expect(isElementCorrect(jumbled, ["s1", "s2", "s3"])).toBe(true);
    expect(isElementCorrect(jumbled, ["s3", "s1", "s2"])).toBe(false);
  });

  it("is wrong when short", () => {
    expect(isElementCorrect(el, ["s1", "s2"])).toBe(false);
  });
});

describe("isElementCorrect: sortCategorize", () => {
  const el: SortCategorizeElement = {
    ...base,
    type: "sortCategorize",
    prompt: "Sort by sound",
    categories: [
      { id: "cat-s", label: "/s/" },
      { id: "cat-sh", label: "/sh/" },
    ],
    items: [
      { id: "i1", label: "Sun", categoryId: "cat-s" },
      { id: "i2", label: "Ship", categoryId: "cat-sh" },
    ],
  };

  it("is correct when every item lands in its own category", () => {
    expect(isElementCorrect(el, { i1: "cat-s", i2: "cat-sh" })).toBe(true);
  });

  it("is wrong when an item lands in the wrong category", () => {
    expect(isElementCorrect(el, { i1: "cat-sh", i2: "cat-sh" })).toBe(false);
  });

  it("is wrong when an item hasn't been placed at all", () => {
    expect(isElementCorrect(el, { i1: "cat-s" })).toBe(false);
  });

  it("treats a missing response as nothing placed", () => {
    expect(isElementCorrect(el, undefined)).toBe(false);
  });
});

describe("isElementCorrect: memoryMatch", () => {
  const el: MemoryMatchElement = {
    ...base,
    type: "memoryMatch",
    prompt: "Find every pair",
    pairs: [
      { id: "m1", label: "Dog" },
      { id: "m2", label: "Cat" },
    ],
  };

  it("is correct once both cards of every pair have been matched", () => {
    expect(isElementCorrect(el, ["m1-a", "m1-b", "m2-a", "m2-b"])).toBe(true);
  });

  it("is wrong while any pair is still incomplete", () => {
    expect(isElementCorrect(el, ["m1-a", "m1-b", "m2-a"])).toBe(false);
  });

  it("is wrong with no matches made", () => {
    expect(isElementCorrect(el, [])).toBe(false);
  });

  it("does not care about the order matched ids arrive in", () => {
    expect(isElementCorrect(el, ["m2-b", "m1-a", "m2-a", "m1-b"])).toBe(true);
  });
});

describe("isElementCorrect: wordHunt", () => {
  const el: WordHuntElement = {
    ...base,
    type: "wordHunt",
    prompt: "Find the /s/ words",
    passage: "Sam sat on the sofa.",
    targetWords: ["Sam", "sofa"],
  };
  // tokens: ["Sam", " ", "sat", " ", "on", " ", "the", " ", "sofa", "."]
  // target indices: 0 ("Sam"), 8 ("sofa")

  it("is correct when exactly the target words are tapped", () => {
    expect(isElementCorrect(el, [0, 8])).toBe(true);
  });

  it("is wrong when a target word is missed", () => {
    expect(isElementCorrect(el, [0])).toBe(false);
  });

  it("is wrong when a non-target word is tapped too", () => {
    expect(isElementCorrect(el, [0, 8, 2])).toBe(false);
  });

  it("is wrong with nothing tapped", () => {
    expect(isElementCorrect(el, undefined)).toBe(false);
  });
});

describe("isElementCorrect: non-interactive elements", () => {
  it("defaults to true so a decorative element never counts against the score", () => {
    const text: TextElement = {
      ...base,
      type: "text",
      content: "hi",
      fontSize: 16,
      fontWeight: "normal",
      color: "#000",
      align: "left",
    };
    expect(isElementCorrect(text, undefined)).toBe(true);
  });
});

describe("scoreCanvas", () => {
  it("counts only interactive elements toward the total", () => {
    const canvas: TemplateCanvas = {
      width: 900,
      height: 600,
      background: "#fff",
      elements: [
        { ...base, id: "t1", type: "text", content: "hi", fontSize: 16, fontWeight: "normal", color: "#000", align: "left" },
        {
          ...base,
          id: "fb1",
          type: "fillBlank",
          template: "2 + 2 = ___",
          answer: "4",
          caseSensitive: false,
        },
      ],
    };
    const result = scoreCanvas(canvas, { fb1: "4" });
    expect(result).toEqual({ correct: 1, total: 1 });
  });

  it("scores interactive elements on pages 2+, not just page 1", () => {
    // canvas.elements is page 1 only; pages 2+ live in canvas.pages. Reading
    // canvas.elements directly used to mean everything after page 1 was
    // silently unscored.
    const canvas: TemplateCanvas = {
      width: 900,
      height: 600,
      background: "#fff",
      elements: [
        { ...base, id: "p1q1", type: "fillBlank", template: "___", answer: "a", caseSensitive: false },
      ],
      pages: [
        {
          id: "page-2",
          pageStyle: "blank",
          elements: [
            { ...base, id: "p2q1", type: "fillBlank", template: "___", answer: "b", caseSensitive: false },
            { ...base, id: "p2q2", type: "fillBlank", template: "___", answer: "c", caseSensitive: false },
          ],
        },
      ],
    };

    expect(scoreCanvas(canvas, { p1q1: "a", p2q1: "b", p2q2: "c" })).toEqual({ correct: 3, total: 3 });
    // A wrong answer on page 2 has to actually cost a mark.
    expect(scoreCanvas(canvas, { p1q1: "a", p2q1: "b", p2q2: "wrong" })).toEqual({
      correct: 2,
      total: 3,
    });
  });

  it("scores a mix of correct and incorrect interactive elements", () => {
    const canvas: TemplateCanvas = {
      width: 900,
      height: 600,
      background: "#fff",
      elements: [
        { ...base, id: "fb1", type: "fillBlank", template: "___", answer: "yes", caseSensitive: false },
        { ...base, id: "fb2", type: "fillBlank", template: "___", answer: "no", caseSensitive: false },
      ],
    };
    const result = scoreCanvas(canvas, { fb1: "yes", fb2: "wrong" });
    expect(result).toEqual({ correct: 1, total: 2 });
  });
});
