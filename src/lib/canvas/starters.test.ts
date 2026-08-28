import { describe, it, expect } from "vitest";
import { STARTER_TEMPLATES, getStarter, isStarterId, starterLibraryRows } from "@/lib/canvas/starters";
import { scoreElement, scoreCanvas } from "@/lib/scoring";
import { INTERACTIVE_TYPES, allPages, isInteractive } from "@/lib/types/canvas";
import type { CanvasElement } from "@/lib/types/canvas";

// A starter is the first thing a new clinician opens, so a broken one is a
// broken first impression — and unlike an authored template there is nobody
// to notice and fix it. These check the properties that would actually spoil
// one: an element off the page, a question with no answer key, a task that
// scores full marks before the patient has done anything.

const allElements = (id: string): CanvasElement[] => {
  const s = getStarter(id);
  if (!s) throw new Error(`no starter ${id}`);
  return allPages(s.canvas).flatMap((p) => p.elements);
};

describe("starter templates", () => {
  it("covers every interactive task type", () => {
    // The promise the library makes is a worked example of each task. If a
    // new type is added without one, this is what says so.
    const covered = new Set(
      STARTER_TEMPLATES.flatMap((s) =>
        allPages(s.canvas)
          .flatMap((p) => p.elements)
          .filter(isInteractive)
          .map((e) => e.type),
      ),
    );
    const missing = INTERACTIVE_TYPES.filter((t) => !covered.has(t));
    expect(missing).toEqual([]);
  });

  it("has unique, stable, prefixed ids", () => {
    const ids = STARTER_TEMPLATES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(isStarterId(id)).toBe(true);
  });

  it("gives every element a unique id within its own canvas", () => {
    // Duplicate ids would make two elements share one response and one
    // selection — the sort of thing that looks fine until it is used.
    for (const s of STARTER_TEMPLATES) {
      const ids = allElements(s.id).map((e) => e.id);
      expect(new Set(ids).size, `${s.id} has duplicate element ids`).toBe(ids.length);
    }
  });

  it("keeps every element inside its own page", () => {
    for (const s of STARTER_TEMPLATES) {
      for (const page of allPages(s.canvas)) {
        for (const el of page.elements) {
          expect(el.x >= 0 && el.y >= 0, `${s.id}/${el.id} starts off the page`).toBe(true);
          expect(
            el.x + el.w <= s.canvas.width,
            `${s.id}/${el.id} runs off the right edge`,
          ).toBe(true);
          expect(
            el.y + el.h <= s.canvas.height,
            `${s.id}/${el.id} runs off the bottom`,
          ).toBe(true);
        }
      }
    }
  });

  it("scores zero out of a real total before anything is answered", () => {
    // Both halves matter. A total of zero would mean the starter has no
    // answer key at all; a non-zero correct count would mean it marks the
    // patient right for doing nothing.
    for (const s of STARTER_TEMPLATES) {
      const interactive = allElements(s.id).filter(isInteractive);
      if (interactive.length === 0) continue; // the printable sheet
      const { correct, total } = scoreCanvas(s.canvas, {});
      expect(total, `${s.id} has nothing to score`).toBeGreaterThan(0);
      expect(correct, `${s.id} scores marks for an empty attempt`).toBe(0);
    }
  });

  it("can be scored full marks, so none of them is unwinnable", () => {
    // Built by answering each element correctly from its own answer key —
    // which is also a check that the key is present and self-consistent.
    for (const s of STARTER_TEMPLATES) {
      for (const el of allElements(s.id).filter(isInteractive)) {
        const responses = perfectResponse(el);
        if (responses === undefined) continue;
        const { correct, total } = scoreElement(el, responses);
        expect(correct, `${s.id}/${el.id} cannot be fully answered`).toBe(total);
      }
    }
  });

  it("lists library rows filtered by medium", () => {
    const print = starterLibraryRows("print");
    expect(print.length).toBeGreaterThan(0);
    expect(print.every((r) => r.medium === "print")).toBe(true);
    expect(starterLibraryRows().length).toBe(STARTER_TEMPLATES.length);
  });
});

// The response that answers one element perfectly. Returns undefined for the
// types with no key to answer against (a drawing, a written answer), which
// the caller skips.
function perfectResponse(el: CanvasElement): unknown {
  switch (el.type) {
    case "multipleChoice":
      return el.options.filter((o) => o.correct).map((o) => o.id);
    case "fillBlank":
      return el.answer;
    case "dragMatch":
      return Object.fromEntries(el.pairs.map((p) => [p.id, p.id]));
    case "sequence":
      return [...el.items].sort((a, b) => a.order - b.order).map((i) => i.id);
    case "sortCategorize":
      return Object.fromEntries(el.items.map((i) => [i.id, i.categoryId]));
    case "memoryMatch":
      return el.pairs.flatMap((p) => [`${p.id}-a`, `${p.id}-b`]);
    case "imageHotspots":
      return el.hotspots.map((h) => h.id);
    case "practiceDrill":
      return Object.fromEntries(el.words.map((w) => [w.id, w.target]));
    case "yesNo":
      return el.answer;
    case "countTap":
      return el.count;
    case "flashcards":
      return el.cards.map((c) => c.id);
    case "photoHunt":
      return el.items.filter((i) => i.isTarget).map((i) => i.id);
    case "sideBySide":
      return Object.fromEntries(el.rounds.map((r) => [r.id, r.answer]));
    case "secretWord":
      return [...el.word.toUpperCase()].filter((c) => /[A-Z]/.test(c));
    case "unscramble":
      return Object.fromEntries(el.words.map((w) => [w.id, w.word]));
    case "wordChunks":
      return Object.fromEntries(el.items.map((i) => [i.id, i.chunks]));
    case "storyTime":
      return el.pages.map((p) => p.id);
    case "puzzle":
      // Every piece in its own place.
      return Array.from(
        { length: Math.max(2, Math.min(5, el.rows)) * Math.max(2, Math.min(5, el.cols)) },
        (_, i) => i,
      );
    case "battleTime":
      return el.cards.map((c) => c.id);
    case "traceGame": {
      // A serpentine down the pad, which is roughly the path a traced letter
      // takes. A single diagonal was the first attempt and it failed: it
      // crosses only the six cells of the diagonal, which is not a plausible
      // trace of an S and correctly did not clear the bar.
      const points: { x: number; y: number }[] = [];
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          points.push({ x: r % 2 === 0 ? t : 1 - t, y: (r + t) / rows });
        }
      }
      return [points];
    }
    case "wordSearch":
      // The grid decides which words actually made it onto the board, so
      // this is exercised by the word-search tests rather than reconstructed
      // from the element here.
      return undefined;
    case "wordHunt":
      // Word hunt's key lives in the tokenizer rather than on the element, so
      // it is exercised by its own tests rather than reconstructed here.
      return undefined;
    default:
      return undefined;
  }
}
