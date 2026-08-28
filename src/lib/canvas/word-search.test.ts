import { describe, it, expect } from "vitest";
import { buildWordSearch, runBetween, matchWord } from "@/lib/canvas/word-search";

// The grid is never stored — the player and the answer key each rebuild it
// from the element — so "same input, same grid" is not a nicety here, it is
// what makes a saved attempt still markable later. And a word that silently
// failed to be placed would be a word the patient is told to find and
// cannot, which is the kind of bug nobody reports and everybody blames
// themselves for.

const WORDS = ["sun", "sock", "soap", "sand"];

describe("buildWordSearch", () => {
  it("is identical for the same words, size and seed", () => {
    const a = buildWordSearch(WORDS, 8, "el-1");
    const b = buildWordSearch(WORDS, 8, "el-1");
    expect(a).toEqual(b);
  });

  it("gives a different board to a different element", () => {
    const a = buildWordSearch(WORDS, 8, "el-1");
    const b = buildWordSearch(WORDS, 8, "el-2");
    expect(a.cells).not.toEqual(b.cells);
  });

  it("actually places every word it did not skip", () => {
    const grid = buildWordSearch(WORDS, 8, "seed");
    expect(grid.skipped).toEqual([]);
    for (const p of grid.placements) {
      let read = "";
      for (let i = 0; i < p.word.length; i++) {
        read += grid.cells[p.row + p.dRow * i][p.col + p.dCol * i];
      }
      expect(read, `${p.word} is not readable at its own placement`).toBe(p.word);
    }
  });

  it("keeps every placement inside the grid", () => {
    const grid = buildWordSearch(WORDS, 6, "seed");
    for (const p of grid.placements) {
      const endRow = p.row + p.dRow * (p.word.length - 1);
      const endCol = p.col + p.dCol * (p.word.length - 1);
      for (const v of [p.row, p.col, endRow, endCol]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(grid.size);
      }
    }
  });

  it("fills every cell with a letter", () => {
    const grid = buildWordSearch(["ab"], 5, "seed");
    expect(grid.cells.length).toBe(5);
    for (const row of grid.cells) {
      expect(row.length).toBe(5);
      for (const cell of row) expect(cell).toMatch(/^[A-Z]$/);
    }
  });

  it("skips a word too long for the grid rather than dropping it silently", () => {
    const grid = buildWordSearch(["elephant", "cat"], 5, "seed");
    expect(grid.skipped).toContain("ELEPHANT");
    expect(grid.placements.map((p) => p.word)).toContain("CAT");
  });

  it("ignores punctuation and single letters in the word list", () => {
    const grid = buildWordSearch(["ice-cream", "a", "  "], 12, "seed");
    expect(grid.placements.map((p) => p.word)).toEqual(["ICECREAM"]);
  });

  it("clamps an absurd size instead of building an unusable board", () => {
    expect(buildWordSearch(WORDS, 0, "s").size).toBe(4);
    expect(buildWordSearch(WORDS, 999, "s").size).toBe(14);
  });
});

describe("runBetween", () => {
  const grid = buildWordSearch(["ab"], 4, "seed");

  it("reads a run across and down", () => {
    const across = runBetween(grid, { row: 0, col: 0 }, { row: 0, col: 2 });
    expect(across?.word.length).toBe(3);
    expect(across?.cells).toHaveLength(3);

    const down = runBetween(grid, { row: 0, col: 0 }, { row: 3, col: 0 });
    expect(down?.word.length).toBe(4);
  });

  it("refuses a diagonal, which this activity does not allow", () => {
    expect(runBetween(grid, { row: 0, col: 0 }, { row: 2, col: 2 })).toBeNull();
  });

  it("refuses a single square, so a stray tap selects nothing", () => {
    expect(runBetween(grid, { row: 1, col: 1 }, { row: 1, col: 1 })).toBeNull();
  });
});

describe("matchWord", () => {
  it("matches a word read in either direction", () => {
    // Dragging right-to-left across SUN has still found SUN, and saying
    // otherwise teaches a child nothing about words.
    expect(matchWord("SUN", WORDS)).toBe("SUN");
    expect(matchWord("NUS", WORDS)).toBe("SUN");
  });

  it("returns null for a run that is not on the list", () => {
    expect(matchWord("QQQ", WORDS)).toBeNull();
  });

  it("normalises the authored list, so a stray hyphen still matches", () => {
    expect(matchWord("ICECREAM", ["ice-cream"])).toBe("ICECREAM");
  });
});
