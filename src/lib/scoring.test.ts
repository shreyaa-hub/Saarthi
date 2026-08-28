import { describe, it, expect } from "vitest";
import { isElementCorrect, scoreElement, scoreCanvas } from "@/lib/scoring";
import type {
  MultipleChoiceElement,
  FillBlankElement,
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

describe("isElementCorrect: imageHotspots", () => {
  const el: ImageHotspotsElement = {
    ...base,
    type: "imageHotspots",
    prompt: "Find them",
    src: "x.png",
    alt: "",
    showOutlines: false,
    hotspots: [
      { id: "h1", label: "Ball", xPct: 10, yPct: 10, wPct: 20, hPct: 20 },
      { id: "h2", label: "Cup", xPct: 50, yPct: 50, wPct: 20, hPct: 20 },
    ],
  };

  it("is correct when every target has been found", () => {
    expect(isElementCorrect(el, ["h1", "h2"])).toBe(true);
  });

  it("does not care what order they were found in", () => {
    expect(isElementCorrect(el, ["h2", "h1"])).toBe(true);
  });

  it("is wrong when one is missed", () => {
    expect(isElementCorrect(el, ["h1"])).toBe(false);
  });

  it("is wrong with nothing found", () => {
    expect(isElementCorrect(el, undefined)).toBe(false);
  });
});

describe("isElementCorrect: practiceDrill", () => {
  const el: PracticeDrillElement = {
    ...base,
    type: "practiceDrill",
    prompt: "Say each five times",
    words: [
      { id: "w1", label: "Sun", target: 5 },
      { id: "w2", label: "Soap", target: 3 },
    ],
  };

  it("is complete when every word reaches its own target", () => {
    expect(isElementCorrect(el, { w1: 5, w2: 3 })).toBe(true);
  });

  it("respects per-word targets rather than one shared number", () => {
    // w2 only needs 3, so 3 is enough for it even though w1 needs 5.
    expect(isElementCorrect(el, { w1: 5, w2: 3 })).toBe(true);
    expect(isElementCorrect(el, { w1: 3, w2: 3 })).toBe(false);
  });

  it("counts above the target still count as done", () => {
    expect(isElementCorrect(el, { w1: 9, w2: 4 })).toBe(true);
  });

  it("is incomplete when a word is short or missing", () => {
    expect(isElementCorrect(el, { w1: 5 })).toBe(false);
    expect(isElementCorrect(el, {})).toBe(false);
  });
});

// Both of these are unmarked by design — a drawing and a language sample
// have no key a computer can check — so what these tests pin down is the
// "did the patient actually do it" bar, which is the only thing scoring can
// honestly say about them.
describe("isElementCorrect: drawPad", () => {
  const el: DrawPadElement = {
    ...base,
    type: "drawPad",
    prompt: "Trace the letter",
    strokeColor: "#000000",
    strokeWidth: 4,
  };

  it("counts a stroke that travelled as an attempt", () => {
    expect(isElementCorrect(el, [[{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.5 }]])).toBe(true);
  });

  it("does not count a single-point stroke, which is a stray tap", () => {
    expect(isElementCorrect(el, [[{ x: 0.1, y: 0.1 }]])).toBe(false);
  });

  it("is incomplete with nothing drawn", () => {
    expect(isElementCorrect(el, [])).toBe(false);
    expect(isElementCorrect(el, undefined)).toBe(false);
  });

  it("ignores junk in the response rather than throwing", () => {
    expect(isElementCorrect(el, "scribble")).toBe(false);
    expect(isElementCorrect(el, [null, 7])).toBe(false);
  });
});

describe("isElementCorrect: longAnswer", () => {
  const anyAnswer: LongAnswerElement = {
    ...base,
    type: "longAnswer",
    prompt: "Tell me about the picture",
    placeholder: "",
    minWords: 0,
    lines: 5,
  };
  const sentence: LongAnswerElement = { ...anyAnswer, minWords: 5 };

  it("accepts any writing when no minimum is set", () => {
    expect(isElementCorrect(anyAnswer, "dog")).toBe(true);
  });

  it("does not accept an empty or whitespace-only answer", () => {
    expect(isElementCorrect(anyAnswer, "")).toBe(false);
    expect(isElementCorrect(anyAnswer, "   \n  ")).toBe(false);
    expect(isElementCorrect(anyAnswer, undefined)).toBe(false);
  });

  it("holds the patient to the clinician's word count", () => {
    expect(isElementCorrect(sentence, "the dog is very big")).toBe(true);
    expect(isElementCorrect(sentence, "the dog is big")).toBe(false);
  });

  it("counts words, not spaces — extra whitespace does not inflate the count", () => {
    expect(isElementCorrect(sentence, "  the   dog  is   very    big  ")).toBe(true);
    expect(isElementCorrect(sentence, "the     dog")).toBe(false);
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

// Partial credit is the whole point of scoreElement. An activity used to be
// marked one element at a time, so matching two of three pairs scored the
// same as matching none — which is both unfair and clinically useless, since
// "two of three today, one of three last week" is exactly the signal a
// clinician reads.
describe("scoreElement: partial credit", () => {
  it("gives drag-to-match a mark per pair", () => {
    const el: DragMatchElement = {
      ...base,
      type: "dragMatch",
      prompt: "Match",
      pairs: [
        { id: "p1", left: "Dog", right: "Woof" },
        { id: "p2", left: "Cat", right: "Meow" },
        { id: "p3", left: "Cow", right: "Moo" },
      ],
    };
    // The reported case: one right, two wrong, used to score zero.
    expect(scoreElement(el, { p1: "p1", p2: "p3", p3: "p2" })).toEqual({ correct: 1, total: 3 });
    expect(scoreElement(el, { p1: "p1", p2: "p2" })).toEqual({ correct: 2, total: 3 });
    expect(scoreElement(el, {})).toEqual({ correct: 0, total: 3 });
    expect(scoreElement(el, { p1: "p1", p2: "p2", p3: "p3" })).toEqual({ correct: 3, total: 3 });
  });

  it("gives sorting a mark per item placed in the right category", () => {
    const el: SortCategorizeElement = {
      ...base,
      type: "sortCategorize",
      prompt: "Sort",
      categories: [{ id: "c1", label: "Animals" }, { id: "c2", label: "Food" }],
      items: [
        { id: "i1", label: "Dog", categoryId: "c1" },
        { id: "i2", label: "Apple", categoryId: "c2" },
        { id: "i3", label: "Cat", categoryId: "c1" },
      ],
    };
    expect(scoreElement(el, { i1: "c1", i2: "c1", i3: "c1" })).toEqual({ correct: 2, total: 3 });
  });

  it("gives sequencing a mark per step in the right position", () => {
    const el: SequenceElement = {
      ...base,
      type: "sequence",
      prompt: "Order",
      items: [
        { id: "s1", label: "One", order: 1 },
        { id: "s2", label: "Two", order: 2 },
        { id: "s3", label: "Three", order: 3 },
      ],
    };
    // First two right, then astray — the first two are genuinely right.
    expect(scoreElement(el, ["s1", "s2"])).toEqual({ correct: 2, total: 3 });
    expect(scoreElement(el, ["s1", "s3", "s2"])).toEqual({ correct: 1, total: 3 });
    expect(scoreElement(el, [])).toEqual({ correct: 0, total: 3 });
  });

  it("gives memory match a mark per pair found", () => {
    const el: MemoryMatchElement = {
      ...base,
      type: "memoryMatch",
      prompt: "Pairs",
      pairs: [{ id: "m1", label: "A" }, { id: "m2", label: "B" }],
    };
    expect(scoreElement(el, ["m1-a", "m1-b"])).toEqual({ correct: 1, total: 2 });
  });

  it("gives the picture hunt a mark per target found", () => {
    const el: ImageHotspotsElement = {
      ...base,
      type: "imageHotspots",
      prompt: "Find", src: "", alt: "", showOutlines: false,
      hotspots: [
        { id: "h1", label: "Dog", xPct: 0, yPct: 0, wPct: 10, hPct: 10 },
        { id: "h2", label: "Ball", xPct: 20, yPct: 20, wPct: 10, hPct: 10 },
      ],
    };
    expect(scoreElement(el, ["h1"])).toEqual({ correct: 1, total: 2 });
  });

  it("gives the practice drill a mark per word that reached its target", () => {
    const el: PracticeDrillElement = {
      ...base,
      type: "practiceDrill",
      prompt: "Say it",
      words: [
        { id: "w1", label: "Sun", target: 5 },
        { id: "w2", label: "Soap", target: 3 },
      ],
    };
    // Deliberately not one mark per repetition: a five-repetition drill would
    // otherwise outweigh a five-pair matching task in the same activity.
    expect(scoreElement(el, { w1: 5, w2: 1 })).toEqual({ correct: 1, total: 2 });
  });

  it("subtracts wrong taps in a word hunt, so tapping everything scores nothing", () => {
    const el: WordHuntElement = {
      ...base,
      type: "wordHunt",
      prompt: "Tap /s/ words",
      passage: "The sun sat on soft grass",
      targetWords: ["sun", "sat", "soft"],
    };
    const tokens = ["The", " ", "sun", " ", "sat", " ", "on", " ", "soft", " ", "grass"];
    const idx = (w: string) => tokens.indexOf(w);

    expect(scoreElement(el, [idx("sun"), idx("sat")])).toEqual({ correct: 2, total: 3 });
    // Two right and two wrong nets zero, not two.
    expect(scoreElement(el, [idx("sun"), idx("sat"), idx("The"), idx("on")])).toEqual({
      correct: 0,
      total: 3,
    });
  });

  it("subtracts wrong choices in a multi-answer question", () => {
    const el: MultipleChoiceElement = {
      ...base,
      type: "multipleChoice",
      prompt: "Which are animals?",
      allowMultiple: true,
      options: [
        { id: "a", label: "Dog", correct: true },
        { id: "b", label: "Cat", correct: true },
        { id: "c", label: "Rock", correct: false },
      ],
    };
    expect(scoreElement(el, ["a"])).toEqual({ correct: 1, total: 2 });
    expect(scoreElement(el, ["a", "b"])).toEqual({ correct: 2, total: 2 });
    // Ticking everything must not score full marks.
    expect(scoreElement(el, ["a", "b", "c"])).toEqual({ correct: 1, total: 2 });
  });

  it("leaves an unfinished element out of the denominator entirely", () => {
    // Neither credited nor penalised: the patient should not lose a mark
    // because the author never ticked a correct answer.
    const noKey: MultipleChoiceElement = {
      ...base,
      type: "multipleChoice",
      prompt: "Unfinished",
      allowMultiple: false,
      options: [{ id: "a", label: "A", correct: false }],
    };
    expect(scoreElement(noKey, ["a"])).toEqual({ correct: 0, total: 0 });
    expect(isElementCorrect(noKey, ["a"])).toBe(true);
  });
});

describe("scoreCanvas: partial credit across an activity", () => {
  it("counts items, not elements, so a part-right question is part-right", () => {
    const canvas: TemplateCanvas = {
      width: 900, height: 600, background: "#fff",
      elements: [
        {
          ...base, id: "dm", type: "dragMatch", prompt: "Match",
          pairs: [
            { id: "p1", left: "a", right: "1" },
            { id: "p2", left: "b", right: "2" },
            { id: "p3", left: "c", right: "3" },
          ],
        },
        { ...base, id: "fb", type: "fillBlank", template: "___", answer: "yes", caseSensitive: false },
      ],
    };

    // One pair of three, plus the blank right: 2 of 4, not 1 of 2 and
    // certainly not 1 of 2 with the match counted as a total failure.
    expect(scoreCanvas(canvas, { dm: { p1: "p1" }, fb: "yes" })).toEqual({ correct: 2, total: 4 });
  });
});

describe("scoreElement: the simple child-facing tasks", () => {
  it("marks yes/no against the authored answer, not the button text", () => {
    const el: YesNoElement = {
      ...base, type: "yesNo", prompt: "Is this a dog?",
      answer: "no", yesLabel: "Same", noLabel: "Different",
    };
    expect(scoreElement(el, "no")).toEqual({ correct: 1, total: 1 });
    expect(scoreElement(el, "yes")).toEqual({ correct: 0, total: 1 });
    // Unanswered, and anything that is not one of the two buttons.
    expect(scoreElement(el, undefined)).toEqual({ correct: 0, total: 1 });
    expect(scoreElement(el, "maybe")).toEqual({ correct: 0, total: 1 });
  });

  it("counts the flashcards the child said they knew", () => {
    const el: FlashcardsElement = {
      ...base, type: "flashcards", prompt: "Turn each card over",
      cards: [
        { id: "c1", front: "Sun", back: "☀️" },
        { id: "c2", front: "Cat", back: "🐱" },
        { id: "c3", front: "Ball", back: "⚽" },
      ],
    };
    expect(scoreElement(el, ["c1", "c3"])).toEqual({ correct: 2, total: 3 });
    expect(scoreElement(el, [])).toEqual({ correct: 0, total: 3 });
    // A card id that is not in the deck cannot inflate the count.
    expect(scoreElement(el, ["c1", "ghost"])).toEqual({ correct: 1, total: 3 });
  });

  it("marks the counting task on the number tapped", () => {
    const el: CountTapElement = {
      ...base, type: "countTap", prompt: "How many?",
      emoji: "🍎", count: 3, maxChoice: 5,
    };
    expect(scoreElement(el, 3)).toEqual({ correct: 1, total: 1 });
    expect(scoreElement(el, 4)).toEqual({ correct: 0, total: 1 });
    // A string "3" is not a tap on the 3 button — the player sends a number.
    expect(scoreElement(el, "3")).toEqual({ correct: 0, total: 1 });
    expect(scoreElement(el, undefined)).toEqual({ correct: 0, total: 1 });
  });
});

describe("scoreElement: the puzzle and word games", () => {
  const search: WordSearchElement = {
    ...base, type: "wordSearch", prompt: "Find them",
    words: ["sun", "sock", "soap"], size: 8,
  };

  it("counts each word found in the search", () => {
    expect(scoreElement(search, ["SUN"])).toEqual({ correct: 1, total: 3 });
    expect(scoreElement(search, ["SUN", "SOCK", "SOAP"])).toEqual({ correct: 3, total: 3 });
    expect(scoreElement(search, [])).toEqual({ correct: 0, total: 3 });
  });

  it("marks the search case-insensitively and ignores words that were never hidden", () => {
    expect(scoreElement(search, ["sun"])).toEqual({ correct: 1, total: 3 });
    // A word the patient could not possibly have found cannot inflate the score.
    expect(scoreElement(search, ["SUN", "ELEPHANT"])).toEqual({ correct: 1, total: 3 });
  });

  it("scores the search out of what actually fits, not what was typed", () => {
    // ELEPHANT does not fit a 5x5 grid, so it is not on the board and must
    // not be counted against a patient who was never shown it.
    const tooSmall: WordSearchElement = { ...search, words: ["elephant", "cat"], size: 5 };
    expect(scoreElement(tooSmall, ["CAT"])).toEqual({ correct: 1, total: 1 });
  });

  const scramble: UnscrambleElement = {
    ...base, type: "unscramble", prompt: "Unscramble",
    words: [
      { id: "w1", word: "sun" },
      { id: "w2", word: "cat" },
    ],
  };

  it("counts each word spelled correctly, whatever the case", () => {
    expect(scoreElement(scramble, { w1: "SUN" })).toEqual({ correct: 1, total: 2 });
    expect(scoreElement(scramble, { w1: "sun", w2: "cat" })).toEqual({ correct: 2, total: 2 });
    expect(scoreElement(scramble, { w1: "nus" })).toEqual({ correct: 0, total: 2 });
    expect(scoreElement(scramble, {})).toEqual({ correct: 0, total: 2 });
  });

  const chunks: WordChunksElement = {
    ...base, type: "wordChunks", prompt: "Build",
    items: [
      { id: "c1", word: "butterfly", chunks: ["but", "ter", "fly"] },
      { id: "c2", word: "rainbow", chunks: ["rain", "bow"] },
    ],
  };

  it("marks chunks on the chunks, not on the letters they spell", () => {
    expect(scoreElement(chunks, { c1: ["but", "ter", "fly"] })).toEqual({ correct: 1, total: 2 });
    // Spells "butterfly" correctly but is not the right syllable split, which
    // is the whole point of the task.
    expect(scoreElement(chunks, { c1: ["but", "terf", "ly"] })).toEqual({ correct: 0, total: 2 });
    // Right chunks, wrong order.
    expect(scoreElement(chunks, { c1: ["ter", "but", "fly"] })).toEqual({ correct: 0, total: 2 });
    // Incomplete.
    expect(scoreElement(chunks, { c1: ["but", "ter"] })).toEqual({ correct: 0, total: 2 });
  });

  it("leaves an empty word game out of the denominator", () => {
    expect(scoreElement({ ...scramble, words: [] }, {})).toEqual({ correct: 0, total: 0 });
    expect(scoreElement({ ...chunks, items: [] }, {})).toEqual({ correct: 0, total: 0 });
  });
});

describe("scoreElement: photo hunt, side by side and secret word", () => {
  const hunt: PhotoHuntElement = {
    ...base, type: "photoHunt", prompt: "Tap the animals", columns: 4,
    items: [
      { id: "a", label: "Dog", isTarget: true },
      { id: "b", label: "Cat", isTarget: true },
      { id: "c", label: "Car", isTarget: false },
      { id: "d", label: "Hat", isTarget: false },
    ],
  };

  it("counts each target tapped and subtracts the wrong ones", () => {
    expect(scoreElement(hunt, ["a"])).toEqual({ correct: 1, total: 2 });
    expect(scoreElement(hunt, ["a", "b"])).toEqual({ correct: 2, total: 2 });
    expect(scoreElement(hunt, ["a", "c"])).toEqual({ correct: 0, total: 2 });
    // Tapping every picture must not score full marks for recognising nothing.
    expect(scoreElement(hunt, ["a", "b", "c", "d"])).toEqual({ correct: 0, total: 2 });
  });

  const compare: SideBySideElement = {
    ...base, type: "sideBySide", prompt: "Which?",
    rounds: [
      { id: "r1", question: "Up?", a: { label: "Up" }, b: { label: "Down" }, answer: "a" },
      { id: "r2", question: "Big?", a: { label: "Mouse" }, b: { label: "Elephant" }, answer: "b" },
    ],
  };

  it("gives a mark per comparison answered correctly", () => {
    expect(scoreElement(compare, { r1: "a" })).toEqual({ correct: 1, total: 2 });
    expect(scoreElement(compare, { r1: "a", r2: "b" })).toEqual({ correct: 2, total: 2 });
    expect(scoreElement(compare, { r1: "b", r2: "a" })).toEqual({ correct: 0, total: 2 });
  });

  const secret: SecretWordElement = {
    ...base, type: "secretWord", prompt: "Guess", word: "sun", hint: "", maxWrong: 3,
  };

  it("is solved only when every letter is found within the allowance", () => {
    expect(scoreElement(secret, ["S", "U", "N"])).toEqual({ correct: 1, total: 1 });
    // Half a revealed word is not half a solved word.
    expect(scoreElement(secret, ["S", "U"])).toEqual({ correct: 0, total: 1 });
    // Right letters, but only after too many wrong ones.
    expect(scoreElement(secret, ["X", "Y", "Z", "Q", "S", "U", "N"])).toEqual({ correct: 0, total: 1 });
    // Wrong guesses inside the allowance still count as solved.
    expect(scoreElement(secret, ["X", "S", "U", "N"])).toEqual({ correct: 1, total: 1 });
  });

  it("ignores the case of a guess and of the authored word", () => {
    expect(scoreElement({ ...secret, word: "Sun" }, ["s", "u", "n"])).toEqual({ correct: 1, total: 1 });
  });

  it("does not score a word with no letters in it", () => {
    expect(scoreElement({ ...secret, word: "123" }, [])).toEqual({ correct: 0, total: 0 });
  });
});
