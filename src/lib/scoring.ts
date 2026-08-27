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
