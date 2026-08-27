import type { CanvasElement, TemplateCanvas } from "@/lib/types/canvas";
import { isInteractive, allPages } from "@/lib/types/canvas";
import { tokenizeWordHunt, targetTokenIndices } from "@/lib/canvas/word-hunt";

export type Responses = Record<string, unknown>;

export function isElementCorrect(element: CanvasElement, response: unknown): boolean {
  switch (element.type) {
    case "multipleChoice": {
      const selected = new Set(Array.isArray(response) ? (response as string[]) : []);
      const correctIds = new Set(element.options.filter((o) => o.correct).map((o) => o.id));
      if (selected.size !== correctIds.size) return false;
      for (const id of selected) if (!correctIds.has(id)) return false;
      return true;
    }
    case "fillBlank": {
      const value = typeof response === "string" ? response.trim() : "";
      const answer = element.answer.trim();
      return element.caseSensitive ? value === answer : value.toLowerCase() === answer.toLowerCase();
    }
    case "dragMatch": {
      const pairs = (response ?? {}) as Record<string, string>;
      return element.pairs.every((p) => pairs[p.id] === p.id);
    }
    case "sequence": {
      const order = Array.isArray(response) ? (response as string[]) : [];
      const correctOrder = [...element.items].sort((a, b) => a.order - b.order).map((i) => i.id);
      if (order.length !== correctOrder.length) return false;
      return order.every((id, i) => id === correctOrder[i]);
    }
    case "sortCategorize": {
      const placements = (response ?? {}) as Record<string, string>;
      return element.items.every((it) => placements[it.id] === it.categoryId);
    }
    case "memoryMatch": {
      // The response holds card ids ("<pairId>-a" / "<pairId>-b"), derived
      // deterministically from each pair's own id — never the shuffled
      // display order, so scoring needs no randomness and can't disagree
      // with whatever order the cards happened to render in for this attempt.
      const matched = new Set(Array.isArray(response) ? (response as string[]) : []);
      return element.pairs.every((p) => matched.has(`${p.id}-a`) && matched.has(`${p.id}-b`));
    }
    case "imageHotspots": {
      // Same shape as wordHunt: the exact set of targets, nothing missed and
      // nothing spurious. A patient who taps everywhere would otherwise score
      // full marks for finding nothing.
      const found = new Set(Array.isArray(response) ? (response as string[]) : []);
      if (found.size !== element.hotspots.length) return false;
      return element.hotspots.every((h) => found.has(h.id));
    }
    case "practiceDrill": {
      // Complete when every word has been produced at least its target
      // number of times. Counts above target are fine — a patient doing
      // extra repetitions has not got it wrong.
      const counts = (response ?? {}) as Record<string, number>;
      return element.words.every((w) => (counts[w.id] ?? 0) >= w.target);
    }
    case "drawPad": {
      // There is no answer key for a drawing, so "correct" here means the
      // patient actually drew something. A single tap leaves a one-point
      // stroke, which is a misfire rather than an attempt, so a stroke has
      // to have travelled at least two points to count.
      const strokes = Array.isArray(response) ? (response as unknown[]) : [];
      return strokes.some((s) => Array.isArray(s) && s.length >= 2);
    }
    case "longAnswer": {
      // Likewise unmarked — a language sample has no single right answer.
      // minWords is the clinician's own bar: 0 means any writing at all.
      const text = typeof response === "string" ? response.trim() : "";
      const words = text ? text.split(/\s+/).length : 0;
      return words >= Math.max(1, element.minWords);
    }
    case "wordHunt": {
      const tapped = new Set(Array.isArray(response) ? (response as number[]) : []);
      const tokens = tokenizeWordHunt(element.passage);
      const targets = targetTokenIndices(tokens, element.targetWords);
      if (tapped.size !== targets.size) return false;
      for (const i of tapped) if (!targets.has(i)) return false;
      return true;
    }
    default:
      return true;
  }
}

// Scores every page, not just the first. canvas.elements holds page 1 only
// (pages 2+ live in canvas.pages — see allPages), so reading it directly
// meant an activity built across several pages was scored on page 1 alone:
// every question the patient answered on page 2 onward counted for nothing,
// and the total they were marked out of was silently wrong.
export function scoreCanvas(canvas: TemplateCanvas, responses: Responses) {
  const interactiveElements = allPages(canvas)
    .flatMap((page) => page.elements)
    .filter(isInteractive);
  const total = interactiveElements.length;
  const correct = interactiveElements.filter((el) => isElementCorrect(el, responses[el.id])).length;
  return { correct, total };
}
