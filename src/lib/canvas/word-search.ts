import { seededShuffle, seededUnit } from "@/lib/canvas/shuffle";

// Grid construction for the word-search activity.
//
// Deterministic from the element's own id, for the same reason every other
// shuffled type in this codebase is: the player is a Client Component that
// Next still server-renders, so a grid built with Math.random() differs
// between the two passes and fails hydration. Seeding makes both agree.
//
// It also means scoring never has to store the grid. The player and the
// answer key can each rebuild the identical grid from the element, so an
// attempt saved today can still be marked next year.

export type Placement = {
  word: string;
  row: number;
  col: number;
  dRow: number;
  dCol: number;
};

export type WordSearchGrid = {
  size: number;
  // Row-major letters, uppercase.
  cells: string[][];
  placements: Placement[];
  // Words that would not fit and were left out, so the UI can say so rather
  // than listing a word that is not in the grid.
  skipped: string[];
};

// Across and down only. Diagonals and reversals are standard in adult
// puzzles and are the reason children give up on them, so they are
// deliberately not offered.
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // across
  [1, 0], // down
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function normalise(word: string): string {
  return word.replace(/[^A-Za-z]/g, "").toUpperCase();
}

function fits(
  cells: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): boolean {
  const size = cells.length;
  for (let i = 0; i < word.length; i++) {
    const r = row + dRow * i;
    const c = col + dCol * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const existing = cells[r][c];
    // Crossing another word is fine — sharing a letter is what makes a grid
    // feel like a puzzle rather than a list — but only on a matching letter.
    if (existing !== null && existing !== word[i]) return false;
  }
  return true;
}

export function buildWordSearch(words: string[], size: number, seed: string): WordSearchGrid {
  // Falsiness is the wrong test here: `Math.round(size) || 8` sent an
  // explicit 0 to 8 rather than to the 4 the clamp promises, so the field
  // behaved differently at its own boundary than one step above it. Only a
  // genuinely absent or non-numeric size should take the default.
  const requested = Number.isFinite(size) ? Math.round(size) : 8;
  const clamped = Math.max(4, Math.min(14, requested));
  const cells: (string | null)[][] = Array.from({ length: clamped }, () =>
    Array.from({ length: clamped }, () => null),
  );

  const placements: Placement[] = [];
  const skipped: string[] = [];

  // Longest first. A long word placed into a nearly full grid usually cannot
  // be placed at all, so taking them in descending length is what keeps the
  // whole list on the board.
  const ordered = [...words]
    .map(normalise)
    .filter((w) => w.length > 1)
    .sort((a, b) => b.length - a.length);

  for (const word of ordered) {
    if (word.length > clamped) {
      skipped.push(word);
      continue;
    }

    // Every starting square and both directions, tried in a seeded order, so
    // the search is exhaustive rather than a fixed number of random guesses —
    // a word that can fit anywhere always gets placed.
    const candidates: Placement[] = [];
    for (const [dRow, dCol] of DIRECTIONS) {
      for (let row = 0; row < clamped; row++) {
        for (let col = 0; col < clamped; col++) {
          candidates.push({ word, row, col, dRow, dCol });
        }
      }
    }

    const shuffled = seededShuffle(candidates, `${seed}:${word}`);
    const spot = shuffled.find((p) => fits(cells, word, p.row, p.col, p.dRow, p.dCol));

    if (!spot) {
      skipped.push(word);
      continue;
    }

    for (let i = 0; i < word.length; i++) {
      cells[spot.row + spot.dRow * i][spot.col + spot.dCol * i] = word[i];
    }
    placements.push(spot);
  }

  // Fill the gaps. Seeded like everything else, so the same element always
  // produces the same board.
  const filled = cells.map((row, r) =>
    row.map((cell, c) => cell ?? ALPHABET[Math.floor(seededUnit(`${seed}:fill:${r}:${c}`) * ALPHABET.length)]),
  );

  return { size: clamped, cells: filled, placements, skipped };
}

// The letters on the straight line between two squares, or null if the two
// are not on a shared row, column — the only runs this activity allows.
export function runBetween(
  grid: WordSearchGrid,
  from: { row: number; col: number },
  to: { row: number; col: number },
): { word: string; cells: { row: number; col: number }[] } | null {
  const dr = Math.sign(to.row - from.row);
  const dc = Math.sign(to.col - from.col);
  if (dr !== 0 && dc !== 0) return null; // diagonal
  if (dr === 0 && dc === 0) return null; // same square

  const steps = Math.max(Math.abs(to.row - from.row), Math.abs(to.col - from.col));
  const cells: { row: number; col: number }[] = [];
  let word = "";
  for (let i = 0; i <= steps; i++) {
    const row = from.row + dr * i;
    const col = from.col + dc * i;
    if (row < 0 || row >= grid.size || col < 0 || col >= grid.size) return null;
    cells.push({ row, col });
    word += grid.cells[row][col];
  }
  return { word, cells };
}

// Which of the element's words a run spells. Read in both directions,
// because a child dragging right-to-left across "SUN" has still found it and
// telling them otherwise teaches nothing about words.
export function matchWord(run: string, words: string[]): string | null {
  const forward = run.toUpperCase();
  const backward = [...forward].reverse().join("");
  for (const w of words) {
    const target = normalise(w);
    if (target && (target === forward || target === backward)) return target;
  }
  return null;
}
