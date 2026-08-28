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
