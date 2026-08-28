import type { CanvasElement, TemplateCanvas } from "@/lib/types/canvas";
import { isInteractive, allPages, memoryPairFaces } from "@/lib/types/canvas";
import { ELEMENT_LIBRARY } from "@/lib/canvas/defaults";
import { tokenizeWordHunt, targetTokenIndices } from "@/lib/canvas/word-hunt";
import { buildWordSearch } from "@/lib/canvas/word-search";
import { scoreElement, type Responses } from "@/lib/scoring";

// Turning a stored attempt back into "what was asked, and what did they say".
//
// The attempt record already held every response, but nothing ever read them:
// a clinician could see 4/7 and had no way to find out *which* three. That is
// the difference between a number and a clinical observation — "missed every
// /s/ in the final position" is the thing you plan a session around, and it
// was sitting in the database unread.
//
// Pure and self-contained on purpose. It takes the canvas and the responses
// and returns text; it touches no database and no React, so the awkward part
// (25 element types, each with its own idea of what an answer looks like) is
// covered by unit tests rather than by clicking through the app.

export type ReviewStatus =
  // Every mark available. */
  | "correct"
  // Some marks, not all — the case that used to be invisible.
  | "partial"
  // Answered, and wrong.
  | "incorrect"
  // Never touched.
  | "unanswered"
  // Nothing to mark: a drawing, a written answer, a story to read through,
  // or a question whose author never ticked a correct option.
  | "unscored";

export type ReviewItem = {
  elementId: string;
  // 1-based, in reading order across every page — the question number a
  // clinician would point at.
  position: number;
  type: CanvasElement["type"];
  typeLabel: string;
  /** The question as the patient saw it. */
  prompt: string;
  /** What the patient did, in words. Empty when they did nothing. */
  given: string[];
  /** What would have been right. Empty when there is no key. */
  expected: string[];
  correct: number;
  total: number;
  status: ReviewStatus;
};

const TYPE_LABELS = new Map(ELEMENT_LIBRARY.map((e) => [e.type, e.label]));

// Response readers. Each returns the stored value in its expected shape, or
// an empty one — a response written by an older version of the player, or
// hand-edited in the database, must never throw here and blank the whole
// review.
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const asNumbers = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x) => typeof x === "number") : []);
const asMap = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const asText = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

// "Dog → Woof" for the pairings, so the clinician reads a mapping rather than
// two lists they have to line up themselves.
const arrow = (from: string, to: string) => `${from} → ${to}`;

function statusFor(correct: number, total: number, answered: boolean): ReviewStatus {
  if (total === 0) return "unscored";
  if (!answered) return "unanswered";
  if (correct === total) return "correct";
  if (correct === 0) return "incorrect";
  return "partial";
}

// Whether the patient did anything at all with this element. Kept separate
// from the score because zero marks and no attempt are different observations:
// a child who tried every pair and got them all wrong needs different help
// from one who never started.
function wasAnswered(response: unknown): boolean {
  if (response === undefined || response === null) return false;
  if (typeof response === "string") return response.trim().length > 0;
  if (Array.isArray(response)) return response.length > 0;
  if (typeof response === "object") return Object.keys(response).length > 0;
  return true;
}

// What the patient did and what was right, per element type. Returns plain
// strings — no JSX — so this stays testable in a node environment.
function describe(element: CanvasElement, response: unknown): { given: string[]; expected: string[] } {
  switch (element.type) {
    case "multipleChoice": {
      const picked = new Set(asList(response));
      const label = (id: string) => element.options.find((o) => o.id === id)?.label ?? "(deleted option)";
      return {
        given: [...picked].map(label),
        expected: element.options.filter((o) => o.correct).map((o) => o.label),
      };
    }

    case "fillBlank":
      return { given: asText(response) ? [asText(response)] : [], expected: [element.answer] };

    case "yesNo": {
      const label = (v: string) => (v === "yes" ? element.yesLabel : element.noLabel);
      const picked = response === "yes" || response === "no" ? response : null;
      return { given: picked ? [label(picked)] : [], expected: [label(element.answer)] };
    }

    case "countTap":
      return {
        given: typeof response === "number" ? [String(response)] : [],
        expected: [String(element.count)],
      };

    case "dragMatch": {
      const placed = asMap(response);
      const rightOf = (id: string) => element.pairs.find((p) => p.id === id)?.right ?? "(deleted)";
      return {
        given: element.pairs
          .filter((p) => typeof placed[p.id] === "string")
          .map((p) => arrow(p.left, rightOf(placed[p.id] as string))),
        expected: element.pairs.map((p) => arrow(p.left, p.right)),
      };
    }

    case "sortCategorize": {
      const placed = asMap(response);
      const category = (id: string) => element.categories.find((c) => c.id === id)?.label ?? "(deleted)";
      return {
        given: element.items
          .filter((it) => typeof placed[it.id] === "string")
          .map((it) => arrow(it.label, category(placed[it.id] as string))),
        expected: element.items.map((it) => arrow(it.label, category(it.categoryId))),
      };
    }

    case "sequence": {
      const order = asList(response);
      const label = (id: string) => element.items.find((i) => i.id === id)?.label ?? "(deleted)";
      return {
        given: order.map((id, i) => `${i + 1}. ${label(id)}`),
        expected: [...element.items]
          .sort((a, b) => a.order - b.order)
          .map((it, i) => `${i + 1}. ${it.label}`),
      };
    }

    case "memoryMatch": {
      const matched = new Set(asList(response));
      // A pair counts as found only with both of its cards turned over, which
      // is the same rule scoreElement applies.
      const found = element.pairs.filter((p) => matched.has(`${p.id}-a`) && matched.has(`${p.id}-b`));
      const name = (p: (typeof element.pairs)[number]) => {
        const { a, b } = memoryPairFaces(p);
        return a.label === b.label ? a.label : arrow(a.label, b.label);
      };
      return { given: found.map(name), expected: element.pairs.map(name) };
    }

    case "imageHotspots": {
      const found = new Set(asList(response));
      return {
        given: element.hotspots.filter((h) => found.has(h.id)).map((h) => h.label),
        expected: element.hotspots.map((h) => h.label),
      };
    }

    case "practiceDrill": {
      const counts = asMap(response);
      return {
        given: element.words.map((w) => {
          const said = typeof counts[w.id] === "number" ? (counts[w.id] as number) : 0;
          return `${w.label}: ${said} of ${w.target}`;
        }),
        expected: element.words.map((w) => `${w.label}: ${w.target}`),
      };
    }

    case "wordHunt": {
      const tokens = tokenizeWordHunt(element.passage);
      const targets = targetTokenIndices(tokens, element.targetWords);
      const tapped = asNumbers(response);
      return {
        // Both the hits and the misfires, marked — the wrong taps are the
        // interesting half of a word hunt.
        given: tapped.map((i) => {
          const word = (tokens[i] ?? "(?)").trim() || "(?)";
          return targets.has(i) ? word : `${word} (not a target)`;
        }),
        expected: element.targetWords,
      };
    }

    case "photoHunt": {
      const tapped = new Set(asList(response));
      const label = (id: string) => element.items.find((i) => i.id === id)?.label ?? "(deleted)";
      return {
        given: [...tapped].map((id) => {
          const item = element.items.find((i) => i.id === id);
          return item?.isTarget ? label(id) : `${label(id)} (not a target)`;
        }),
        expected: element.items.filter((i) => i.isTarget).map((i) => i.label),
      };
    }

    case "sideBySide": {
      const picks = asMap(response);
      const side = (r: (typeof element.rounds)[number], which: unknown) =>
        which === "a" ? r.a.label : which === "b" ? r.b.label : null;
      return {
        given: element.rounds
          .map((r) => {
            const chosen = side(r, picks[r.id]);
            return chosen ? `${r.question} ${arrow("", chosen).trim()}` : null;
          })
          .filter((s): s is string => s !== null),
        expected: element.rounds.map((r) => `${r.question} → ${side(r, r.answer)}`),
      };
    }

    case "flashcards": {
      const known = new Set(asList(response));
      return {
        // Self-rated, so this is what the child said, not what the app checked.
        given: element.cards.filter((c) => known.has(c.id)).map((c) => `Knew it: ${c.front}`),
        expected: [],
      };
    }

    case "wordSearch": {
      const found = new Set(asList(response).map((w) => w.toUpperCase()));
      const grid = buildWordSearch(element.words, element.size, element.id);
      const placed = grid.placements.map((p) => p.word);
      return {
        given: placed.filter((w) => found.has(w)),
        // Only the words that actually fit on the board — one that could not
        // be placed was never findable and is not held against the patient.
        expected: placed,
      };
    }

    case "unscramble": {
      const built = asMap(response);
      return {
        given: element.words
          .filter((w) => asText(built[w.id]))
          .map((w) => arrow(w.word, asText(built[w.id]))),
        expected: element.words.map((w) => w.word),
      };
    }

    case "wordChunks": {
      const built = asMap(response);
      return {
        given: element.items
          .filter((it) => Array.isArray(built[it.id]) && (built[it.id] as unknown[]).length > 0)
          .map((it) => arrow(it.word, asList(built[it.id]).join("-"))),
        expected: element.items.map((it) => `${it.word} → ${it.chunks.join("-")}`),
      };
    }

    case "secretWord": {
      const guessed = asList(response).map((g) => g.toUpperCase());
      const letters = new Set([...element.word.toUpperCase()].filter((c) => /[A-Z]/.test(c)));
      const wrong = guessed.filter((g) => !letters.has(g));
      return {
        given: guessed.length
          ? [
              `Guessed: ${guessed.join(" ")}`,
              ...(wrong.length ? [`Wrong letters: ${wrong.join(" ")} (${wrong.length} of ${element.maxWrong} allowed)`] : []),
            ]
          : [],
        expected: [element.word.toUpperCase()],
      };
    }

    case "storyTime": {
      const seen = new Set(asList(response));
      const read = element.pages.filter((p) => seen.has(p.id)).length;
      return {
        given: read ? [`Read ${read} of ${element.pages.length} pages`] : [],
        expected: [],
      };
    }

    case "puzzle": {
      const order = asNumbers(response);
      const pieces = Math.max(1, Math.round(element.rows)) * Math.max(1, Math.round(element.cols));
      const home = order.filter((piece, i) => piece === i).length;
      return {
        given: order.length ? [`${home} of ${pieces} pieces in place`] : [],
        expected: [],
      };
    }

    case "battleTime": {
      const revealed = new Set(asList(response));
      const played = element.cards.filter((c) => revealed.has(c.id));
      return {
        given: played.length ? [`Played ${played.length} of ${element.cards.length} cards`] : [],
        expected: [],
      };
    }

    case "longAnswer": {
      // The whole point of this type: the words themselves are the record,
      // so they are reproduced rather than summarised.
      const text = asText(response);
      return { given: text ? [text] : [], expected: [] };
    }

    case "drawPad":
    case "traceGame": {
      const strokes = Array.isArray(response) ? response : [];
      const drawn = strokes.filter((s) => Array.isArray(s) && s.length >= 2).length;
      return {
        // The drawing itself can't be rendered as text. What is honest here is
        // that something was drawn; the marks are the clinician's to judge.
        given: drawn ? [`${drawn} stroke${drawn === 1 ? "" : "s"} drawn`] : [],
        expected: element.type === "traceGame" ? [`Trace: ${element.glyph}`] : [],
      };
    }

    default:
      return { given: [], expected: [] };
  }
}

// The prompt as the patient saw it. Most types call it `prompt`; the two that
// don't are named here rather than left blank, since an unlabelled row in the
// review is useless.
function promptFor(element: CanvasElement): string {
  if (element.type === "storyTime") return element.title;
  if (element.type === "fillBlank") return element.template;
  return "prompt" in element && typeof element.prompt === "string" ? element.prompt : "";
}

// One row per interactive element, in reading order across every page —
// the same set of elements scoreCanvas marks, so the rows always add up to
// the attempt's recorded score.
export function reviewCanvas(canvas: TemplateCanvas, responses: Responses): ReviewItem[] {
  const elements = allPages(canvas)
    .flatMap((page) => page.elements)
    .filter(isInteractive);

  return elements.map((element, i) => {
    const response = responses[element.id];
    const { correct, total } = scoreElement(element, response);
    const { given, expected } = describe(element, response);
    return {
      elementId: element.id,
      position: i + 1,
      type: element.type,
      typeLabel: TYPE_LABELS.get(element.type) ?? element.type,
      prompt: promptFor(element),
      given,
      expected,
      correct,
      total,
      status: statusFor(correct, total, wasAnswered(response)),
    };
  });
}
