import type { CanvasElement, TemplateCanvas } from "@/lib/types/canvas";
import { isInteractive } from "@/lib/types/canvas";

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
    default:
      return true;
  }
}

export function scoreCanvas(canvas: TemplateCanvas, responses: Responses) {
  const interactiveElements = canvas.elements.filter(isInteractive);
  const total = interactiveElements.length;
  const correct = interactiveElements.filter((el) => isElementCorrect(el, responses[el.id])).length;
  return { correct, total };
}
