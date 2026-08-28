import { describe, it, expect } from "vitest";
import { reviewCanvas } from "@/lib/review";
import { scoreCanvas } from "@/lib/scoring";
import { STARTER_TEMPLATES, getStarter } from "@/lib/canvas/starters";
import { INTERACTIVE_TYPES, allPages, isInteractive } from "@/lib/types/canvas";
import type { CanvasElement, TemplateCanvas } from "@/lib/types/canvas";

// The review is what a clinician reads instead of the raw jsonb, so the thing
// worth testing is that it says something true about every element type — not
// that it renders, but that "what they answered" is actually what they
// answered, and that it never disagrees with the score the attempt was
// recorded with.

const canvasOf = (id: string): TemplateCanvas => {
  const s = getStarter(id);
  if (!s) throw new Error(`no starter ${id}`);
  return s.canvas;
};

const elementsOf = (canvas: TemplateCanvas): CanvasElement[] =>
  allPages(canvas).flatMap((p) => p.elements).filter(isInteractive);

const only = (canvas: TemplateCanvas, type: string) => {
  const el = elementsOf(canvas).find((e) => e.type === type);
  if (!el) throw new Error(`no ${type} in this starter`);
  return el;
};

describe("reviewCanvas", () => {
  it("returns one row per interactive element, numbered in reading order", () => {
    const canvas = canvasOf("starter__spellingPractice");
    const rows = reviewCanvas(canvas, {});
    expect(rows.length).toBe(elementsOf(canvas).length);
    expect(rows.map((r) => r.position)).toEqual(rows.map((_, i) => i + 1));
  });

  it("adds up to exactly the score the attempt was recorded with", () => {
    // If these ever disagree, the clinician is reading a breakdown that
    // contradicts the number next to it — which is worse than no breakdown.
    for (const starter of STARTER_TEMPLATES) {
      const canvas = starter.canvas;
      const rows = reviewCanvas(canvas, {});
      const summed = rows.reduce(
        (acc, r) => ({ correct: acc.correct + r.correct, total: acc.total + r.total }),
        { correct: 0, total: 0 },
      );
      expect(summed, `${starter.id} breakdown disagrees with its score`).toEqual(
        scoreCanvas(canvas, {}),
      );
    }
  });

  it("labels every interactive type with something readable", () => {
    // A row headed "sortCategorize" is a leaked internal name.
    for (const type of INTERACTIVE_TYPES) {
      const starter = STARTER_TEMPLATES.find((s) =>
        elementsOf(s.canvas).some((e) => e.type === type),
      );
      expect(starter, `no starter covers ${type}`).toBeDefined();
      const row = reviewCanvas(starter!.canvas, {}).find((r) => r.type === type);
      expect(row, `${type} produced no review row`).toBeDefined();
      expect(row!.typeLabel).not.toBe(type);
      expect(row!.typeLabel.length).toBeGreaterThan(2);
    }
  });

  it("separates 'never touched it' from 'got it wrong'", () => {
    const canvas = canvasOf("starter__yesNo");
    const el = only(canvas, "yesNo");
    if (el.type !== "yesNo") throw new Error("unreachable");

    expect(reviewCanvas(canvas, {})[0].status).toBe("unanswered");
    const wrong = el.answer === "yes" ? "no" : "yes";
    expect(reviewCanvas(canvas, { [el.id]: wrong })[0].status).toBe("incorrect");
    expect(reviewCanvas(canvas, { [el.id]: el.answer })[0].status).toBe("correct");
  });

  it("reports partial credit as partial", () => {
    const canvas = canvasOf("starter__dragMatch");
    const el = only(canvas, "dragMatch");
    if (el.type !== "dragMatch") throw new Error("unreachable");

    const onePair = { [el.pairs[0].id]: el.pairs[0].id };
    const row = reviewCanvas(canvas, { [el.id]: onePair })[0];
    expect(row.status).toBe("partial");
    expect(row.correct).toBe(1);
    expect(row.total).toBe(el.pairs.length);
  });

  it("takes an unmarkable element out of the denominator, not down to zero", () => {
    // A drawing has nothing to mark. "unscored" says so; a status of
    // "incorrect" would read as the patient having failed it.
    const canvas = canvasOf("starter__drawPad");
    const rows = reviewCanvas(canvas, {});
    const drawing = rows.find((r) => r.type === "drawPad")!;
    expect(drawing.status).toBe("unanswered");
    expect(drawing.total).toBe(1);
  });

  it("shows what was chosen and what was correct, by label not by id", () => {
    const canvas = canvasOf("starter__multipleChoice");
    const el = only(canvas, "multipleChoice");
    if (el.type !== "multipleChoice") throw new Error("unreachable");

    const wrong = el.options.find((o) => !o.correct)!;
    const row = reviewCanvas(canvas, { [el.id]: [wrong.id] })[0];
    expect(row.given).toEqual([wrong.label]);
    expect(row.expected).toEqual(el.options.filter((o) => o.correct).map((o) => o.label));
    // No raw ids anywhere in what the clinician reads.
    for (const line of [...row.given, ...row.expected]) {
      expect(line).not.toContain(wrong.id);
    }
  });

  it("reads a drag-to-match answer as the mapping the patient built", () => {
    const canvas = canvasOf("starter__dragMatch");
    const el = only(canvas, "dragMatch");
    if (el.type !== "dragMatch") throw new Error("unreachable");

    // Deliberately mismatched: the first left item dropped on the second
    // right item, which is the mistake a clinician wants to see spelled out.
    const row = reviewCanvas(canvas, { [el.id]: { [el.pairs[0].id]: el.pairs[1].id } })[0];
    expect(row.given).toEqual([`${el.pairs[0].left} → ${el.pairs[1].right}`]);
    expect(row.expected).toContain(`${el.pairs[0].left} → ${el.pairs[0].right}`);
  });

  it("marks a wrong tap in a word hunt as a wrong tap", () => {
    // The misfires are half the clinical signal here, so they have to be
    // visible rather than silently dropped from the list.
    const canvas = canvasOf("starter__wordHunt");
    const el = only(canvas, "wordHunt");
    if (el.type !== "wordHunt") throw new Error("unreachable");

    const rows = reviewCanvas(canvas, { [el.id]: [0, 1, 2, 3, 4] });
    const row = rows.find((r) => r.type === "wordHunt")!;
    expect(row.given.length).toBe(5);
    expect(row.given.some((g) => g.includes("not a target"))).toBe(true);
  });

  it("reproduces a written answer verbatim, since that is the whole record", () => {
    const canvas = canvasOf("starter__longAnswer");
    const el = only(canvas, "longAnswer");
    const written = "The dog ran to the park and then he was happy.";
    const row = reviewCanvas(canvas, { [el.id]: written }).find((r) => r.type === "longAnswer")!;
    expect(row.given).toEqual([written]);
    expect(row.status).toBe("correct");
  });

  it("hands back the strokes themselves for a drawing, not just a count", () => {
    const canvas = canvasOf("starter__drawPad");
    const el = only(canvas, "drawPad");
    const strokes = [
      [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }],
      [{ x: 0.9, y: 0.1 }, { x: 0.1, y: 0.9 }],
    ];
    const row = reviewCanvas(canvas, { [el.id]: strokes }).find((r) => r.type === "drawPad")!;
    expect(row.drawing?.strokes).toEqual(strokes);
    expect(row.drawing?.strokeColor).toBeTruthy();
  });

  it("carries the traced glyph so the attempt can be judged against the target", () => {
    const canvas = canvasOf("starter__traceGame");
    const el = only(canvas, "traceGame");
    if (el.type !== "traceGame") throw new Error("unreachable");
    const row = reviewCanvas(canvas, {
      [el.id]: [[{ x: 0, y: 0 }, { x: 1, y: 1 }]],
    }).find((r) => r.type === "traceGame")!;
    expect(row.drawing?.glyph).toBe(el.glyph);
  });

  it("offers no drawing when the pad was never touched", () => {
    const canvas = canvasOf("starter__drawPad");
    const el = only(canvas, "drawPad");
    expect(reviewCanvas(canvas, {})[0].drawing).toBeUndefined();
    // A single point is a tap, not a stroke — nothing to draw.
    const tapped = reviewCanvas(canvas, { [el.id]: [[{ x: 0.5, y: 0.5 }]] });
    expect(tapped.find((r) => r.type === "drawPad")!.drawing).toBeUndefined();
  });

  it("never emits a point an SVG cannot draw", () => {
    // jsonb, so NaN, nulls, strings and out-of-range values all have to be
    // survivable. One NaN in a polyline blanks the whole drawing silently.
    const canvas = canvasOf("starter__drawPad");
    const el = only(canvas, "drawPad");
    const junk = [
      [{ x: 0.2, y: 0.2 }, { x: "no", y: 0.4 }, { x: 0.6, y: null }, { x: 5, y: -3 }, { x: 0.8, y: 0.8 }],
      [null, { x: 0.1, y: 0.1 }],
    ];
    const row = reviewCanvas(canvas, { [el.id]: junk }).find((r) => r.type === "drawPad")!;
    for (const stroke of row.drawing?.strokes ?? []) {
      for (const p of stroke) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1).toBe(true);
      }
    }
    // The out-of-range point is clamped and kept, not silently dropped.
    expect(row.drawing?.strokes[0]).toContainEqual({ x: 1, y: 0 });
  });

  it("survives a malformed response instead of blanking the review", () => {
    // Responses are jsonb written by an older client or edited by hand. A
    // throw here would cost the clinician the whole attempt, not one row.
    const canvas = canvasOf("starter__dragMatch");
    const el = only(canvas, "dragMatch");
    for (const junk of [null, 42, "nonsense", [], {}, [{ deep: true }], { [el.id]: undefined }]) {
      expect(() => reviewCanvas(canvas, { [el.id]: junk })).not.toThrow();
    }
  });

  it("never throws on any starter, answered or not", () => {
    for (const starter of STARTER_TEMPLATES) {
      expect(() => reviewCanvas(starter.canvas, {}), starter.id).not.toThrow();
      const noise = Object.fromEntries(
        elementsOf(starter.canvas).map((e) => [e.id, ["junk"]]),
      );
      expect(() => reviewCanvas(starter.canvas, noise), starter.id).not.toThrow();
    }
  });
});

// The scoring the server now does on submit is scoreCanvas over the
// assignment's own canvas_snapshot. These pin the properties submitAttempt
// depends on — that the client's claimed numbers are irrelevant, and that
// marking is decided entirely by the snapshot plus the responses.
describe("server-side scoring of a submitted attempt", () => {
  it("scores an empty attempt at zero however it is submitted", () => {
    for (const starter of STARTER_TEMPLATES) {
      const { correct } = scoreCanvas(starter.canvas, {});
      expect(correct, `${starter.id} awards marks for nothing`).toBe(0);
    }
  });

  it("ignores responses for elements that are not on the canvas", () => {
    // The shape a fabricated submission takes: keys that mark nothing,
    // because they belong to no element in the snapshot.
    const canvas = canvasOf("starter__dragMatch");
    const honest = scoreCanvas(canvas, {});
    const padded = scoreCanvas(canvas, {
      "not-an-element": [1, 2, 3],
      "another-fake": { a: "b" },
    });
    expect(padded).toEqual(honest);
  });

  it("cannot be pushed above the canvas's own total", () => {
    const canvas = canvasOf("starter__dragMatch");
    const el = only(canvas, "dragMatch");
    if (el.type !== "dragMatch") throw new Error("unreachable");
    // Every pair right, plus junk mappings for pairs that do not exist.
    const stuffed: Record<string, string> = Object.fromEntries(
      el.pairs.map((p) => [p.id, p.id]),
    );
    for (let i = 0; i < 50; i++) stuffed[`ghost-${i}`] = `ghost-${i}`;
    const { correct, total } = scoreCanvas(canvas, { [el.id]: stuffed });
    expect(total).toBe(el.pairs.length);
    expect(correct).toBe(total);
    expect(correct).toBeLessThanOrEqual(total);
  });
});
