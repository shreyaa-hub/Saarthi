import type { CanvasElement, TemplateCanvas } from "@/lib/types/canvas";
import { isInteractive, allPages } from "@/lib/types/canvas";
import { tokenizeWordHunt, targetTokenIndices } from "@/lib/canvas/word-hunt";
import { buildWordSearch } from "@/lib/canvas/word-search";

export type Responses = Record<string, unknown>;

// How much of one element the patient got right, and how much there was to
// get right. This replaces a plain boolean, and the difference is not
// cosmetic: an activity used to be marked one element at a time, so a
// drag-to-match with three pairs where the patient matched two correctly
// scored zero — identical, in the record, to a patient who matched none.
//
// That is wrong clinically as well as unfair. Therapy progress IS the partial
// credit: "two of three today, one of three last week" is the entire signal a
// clinician is looking for, and rounding it to 0/1 threw it away. Every
// accuracy figure in the app derives from these numbers, so counting items
// rather than elements fixes the attempt record, the progress chart, the
// domain breakdown and the trend lines in one place.
//
// `total` of 0 means "nothing to mark here". That is not the same as a score
// of zero — it takes the element out of the denominator entirely, which is
// what an unfinished element (a question with no correct answer ticked, a
// word hunt with no target words) deserves: the patient should be neither
// credited nor penalised for the author not having finished it.
export type ElementScore = { correct: number; total: number };

const NOT_SCORED: ElementScore = { correct: 0, total: 0 };

// Credit for the right choices, less the wrong ones, never below zero. Used
// where the patient can tap things that are not answers — without the
// subtraction, tapping every word in a word hunt would score full marks for
// finding nothing.
function netScore(hits: number, misfires: number, total: number): ElementScore {
  return { correct: Math.max(0, hits - misfires), total };
}

export function scoreElement(element: CanvasElement, response: unknown): ElementScore {
  switch (element.type) {
    case "multipleChoice": {
      const selected = new Set(Array.isArray(response) ? (response as string[]) : []);
      const correctIds = new Set(element.options.filter((o) => o.correct).map((o) => o.id));
      if (correctIds.size === 0) return NOT_SCORED;

      let hits = 0;
      let misfires = 0;
      for (const id of selected) {
        if (correctIds.has(id)) hits += 1;
        else misfires += 1;
      }
      return netScore(hits, misfires, correctIds.size);
    }

    case "fillBlank": {
      const value = typeof response === "string" ? response.trim() : "";
      const answer = element.answer.trim();
      const hit = element.caseSensitive
        ? value === answer
        : value.toLowerCase() === answer.toLowerCase();
      return { correct: hit ? 1 : 0, total: 1 };
    }

    case "dragMatch": {
      // One mark per pair. The response maps a left id to the right id the
      // patient dropped on it, and the two ids are the same for a correct
      // pair — see DragMatchPlayer.
      const pairs = (response ?? {}) as Record<string, string>;
      if (element.pairs.length === 0) return NOT_SCORED;
      return {
        correct: element.pairs.filter((p) => pairs[p.id] === p.id).length,
        total: element.pairs.length,
      };
    }

    case "sequence": {
      // One mark per step put in the right place. Position, not neighbours:
      // a patient who has the first two steps right and then goes astray has
      // genuinely got the first two right, and that is what the clinician
      // wants to see.
      const order = Array.isArray(response) ? (response as string[]) : [];
      const correctOrder = [...element.items].sort((a, b) => a.order - b.order).map((i) => i.id);
      if (correctOrder.length === 0) return NOT_SCORED;
      return {
        correct: correctOrder.filter((id, i) => order[i] === id).length,
        total: correctOrder.length,
      };
    }

    case "sortCategorize": {
      const placements = (response ?? {}) as Record<string, string>;
      if (element.items.length === 0) return NOT_SCORED;
      return {
        correct: element.items.filter((it) => placements[it.id] === it.categoryId).length,
        total: element.items.length,
      };
    }

    case "memoryMatch": {
      // The response holds card ids ("<pairId>-a" / "<pairId>-b"), derived
      // deterministically from each pair's own id — never the shuffled
      // display order, so scoring needs no randomness and can't disagree
      // with whatever order the cards happened to render in for this attempt.
      const matched = new Set(Array.isArray(response) ? (response as string[]) : []);
      if (element.pairs.length === 0) return NOT_SCORED;
      return {
        correct: element.pairs.filter((p) => matched.has(`${p.id}-a`) && matched.has(`${p.id}-b`))
          .length,
        total: element.pairs.length,
      };
    }

    case "imageHotspots": {
      // Only real target ids can end up in the response — the player writes
      // a hotspot's own id when it is tapped, and tapping elsewhere in the
      // picture writes nothing — so there are no misfires to subtract here.
      const found = new Set(Array.isArray(response) ? (response as string[]) : []);
      if (element.hotspots.length === 0) return NOT_SCORED;
      return {
        correct: element.hotspots.filter((h) => found.has(h.id)).length,
        total: element.hotspots.length,
      };
    }

    case "practiceDrill": {
      // One mark per word that reached its own repetition target, rather than
      // one per repetition: a five-repetition drill would otherwise weigh
      // five times as much as a five-pair matching task in the same activity.
      // Counts above target are fine — extra repetitions are not an error.
      const counts = (response ?? {}) as Record<string, number>;
      if (element.words.length === 0) return NOT_SCORED;
      return {
        correct: element.words.filter((w) => (counts[w.id] ?? 0) >= w.target).length,
        total: element.words.length,
      };
    }

    case "drawPad": {
      // There is no answer key for a drawing, so "correct" here means the
      // patient actually drew something. A single tap leaves a one-point
      // stroke, which is a misfire rather than an attempt, so a stroke has
      // to have travelled at least two points to count.
      const strokes = Array.isArray(response) ? (response as unknown[]) : [];
      const drew = strokes.some((s) => Array.isArray(s) && s.length >= 2);
      return { correct: drew ? 1 : 0, total: 1 };
    }

    case "longAnswer": {
      // Likewise unmarked — a language sample has no single right answer.
      // minWords is the clinician's own bar: 0 means any writing at all.
      const text = typeof response === "string" ? response.trim() : "";
      const words = text ? text.split(/\s+/).length : 0;
      return { correct: words >= Math.max(1, element.minWords) ? 1 : 0, total: 1 };
    }

    case "wordHunt": {
      // Tapping a word that is not a target is a real error here, unlike in
      // the picture hunt, because every word in the passage is tappable.
      const tapped = Array.isArray(response) ? (response as number[]) : [];
      const tokens = tokenizeWordHunt(element.passage);
      const targets = targetTokenIndices(tokens, element.targetWords);
      if (targets.size === 0) return NOT_SCORED;

      let hits = 0;
      let misfires = 0;
      for (const i of tapped) {
        if (targets.has(i)) hits += 1;
        else misfires += 1;
      }
      return netScore(hits, misfires, targets.size);
    }

    case "yesNo": {
      // One question, one mark. No penalty arithmetic to do — there are two
      // buttons and the child pressed one of them.
      const picked = response === "yes" || response === "no" ? response : null;
      return { correct: picked === element.answer ? 1 : 0, total: 1 };
    }

    case "flashcards": {
      // Self-rated, so this is not marked against a key: the response is the
      // set of cards the child said they knew, and what it measures is how
      // many of the deck that was. Recording it as accuracy is honest as long
      // as nobody reads it as the app having checked anything — which is why
      // the player labels the buttons "I knew it" and "Practise again"
      // rather than right and wrong.
      const known = new Set(Array.isArray(response) ? (response as string[]) : []);
      if (element.cards.length === 0) return NOT_SCORED;
      return {
        correct: element.cards.filter((c) => known.has(c.id)).length,
        total: element.cards.length,
      };
    }

    case "countTap": {
      const picked = typeof response === "number" ? response : null;
      return { correct: picked === element.count ? 1 : 0, total: 1 };
    }

    case "wordSearch": {
      // One mark per word found. The grid is rebuilt rather than read from
      // the response, so what counts as findable is decided by the element
      // and never by what the player happened to render — including for a
      // word the builder could not fit, which is excluded from the total
      // rather than marked against the patient.
      const found = new Set(
        (Array.isArray(response) ? (response as string[]) : []).map((w) => w.toUpperCase()),
      );
      const grid = buildWordSearch(element.words, element.size, element.id);
      if (grid.placements.length === 0) return NOT_SCORED;
      return {
        correct: grid.placements.filter((p) => found.has(p.word)).length,
        total: grid.placements.length,
      };
    }

    case "unscramble": {
      // The response is what the patient spelled for each word. Compared
      // case-insensitively: a child who spells SUN in capitals has spelled it.
      const built = (response ?? {}) as Record<string, string>;
      if (element.words.length === 0) return NOT_SCORED;
      return {
        correct: element.words.filter(
          (w) => (built[w.id] ?? "").toUpperCase() === w.word.toUpperCase().replace(/\s+/g, ""),
        ).length,
        total: element.words.length,
      };
    }

    case "wordChunks": {
      // Marked on the chunks in order, not on the letters they spell —
      // otherwise "but-terf-ly" would pass a task about syllables.
      const built = (response ?? {}) as Record<string, string[]>;
      if (element.items.length === 0) return NOT_SCORED;
      return {
        correct: element.items.filter((item) => {
          const attempt = built[item.id];
          if (!Array.isArray(attempt) || attempt.length !== item.chunks.length) return false;
          return attempt.every((c, i) => c.toUpperCase() === item.chunks[i].toUpperCase());
        }).length,
        total: element.items.length,
      };
    }

    case "photoHunt": {
      // Several right answers among distractors, so a wrong tap is a real
      // error and is subtracted — otherwise tapping every picture would
      // score full marks for recognising nothing.
      const tapped = new Set(Array.isArray(response) ? (response as string[]) : []);
      const targets = new Set(element.items.filter((i) => i.isTarget).map((i) => i.id));
      if (targets.size === 0) return NOT_SCORED;

      let hits = 0;
      let misfires = 0;
      for (const id of tapped) {
        if (targets.has(id)) hits += 1;
        else misfires += 1;
      }
      return netScore(hits, misfires, targets.size);
    }

    case "sideBySide": {
      const picks = (response ?? {}) as Record<string, string>;
      if (element.rounds.length === 0) return NOT_SCORED;
      return {
        correct: element.rounds.filter((r) => picks[r.id] === r.answer).length,
        total: element.rounds.length,
      };
    }

    case "secretWord": {
      // Solved when every letter of the word has been guessed within the
      // allowance. Deliberately all-or-nothing: half a revealed word is not
      // half a solved word, and the letters still hidden are the ones the
      // child could not get.
      const guessed = new Set(
        (Array.isArray(response) ? (response as string[]) : []).map((g) => g.toUpperCase()),
      );
      const letters = [...element.word.toUpperCase()].filter((c) => /[A-Z]/.test(c));
      if (letters.length === 0) return NOT_SCORED;

      const wrong = [...guessed].filter((g) => !letters.includes(g)).length;
      const solved = letters.every((c) => guessed.has(c));
      return { correct: solved && wrong <= element.maxWrong ? 1 : 0, total: 1 };
    }

    default:
      return NOT_SCORED;
  }
}

// Whether the element is fully correct — what the player uses to decide
// whether to draw a tick or a cross. Derived from scoreElement so the mark on
// screen and the number in the record can never disagree. An element with
// nothing to mark counts as correct, so a decorative element is never held
// against the patient.
export function isElementCorrect(element: CanvasElement, response: unknown): boolean {
  const { correct, total } = scoreElement(element, response);
  return total === 0 || correct === total;
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

  return interactiveElements.reduce(
    (running, el) => {
      const { correct, total } = scoreElement(el, responses[el.id]);
      return { correct: running.correct + correct, total: running.total + total };
    },
    { correct: 0, total: 0 },
  );
}
