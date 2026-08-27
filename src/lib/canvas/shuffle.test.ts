import { describe, it, expect } from "vitest";
import { seededShuffle } from "@/lib/canvas/shuffle";

describe("seededShuffle", () => {
  it("returns every input element exactly once", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = seededShuffle(input, "seed");
    expect(result).toHaveLength(input.length);
    expect([...result].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    seededShuffle(input, "seed");
    expect(input).toEqual(copy);
  });

  // The whole point of seeding: the server render and the client hydration
  // pass must produce byte-identical output, or React tears the tree down.
  it("is deterministic for the same seed", () => {
    const input = ["a", "b", "c", "d", "e", "f"];
    expect(seededShuffle(input, "el-123")).toEqual(seededShuffle(input, "el-123"));
  });

  it("gives different orders for different seeds", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const a = seededShuffle(input, "el-1").join("");
    const b = seededShuffle(input, "el-2").join("");
    const c = seededShuffle(input, "el-3").join("");
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  // The property the activities actually depend on: no element may be left
  // in the slot it started in. In drag-to-match a fixed point is a right-hand
  // option sitting beside the left item it belongs with — a pair the patient
  // can complete without reading either side.
  it("leaves no element in its original position (a derangement)", () => {
    for (let n = 2; n <= 8; n++) {
      const input = Array.from({ length: n }, (_, i) => `item-${i}`);
      for (let s = 0; s < 250; s++) {
        const result = seededShuffle(input, `seed-${n}-${s}`);
        result.forEach((item, i) => {
          expect(item).not.toBe(input[i]);
        });
      }
    }
  });

  it("still returns a full permutation after deranging", () => {
    const input = Array.from({ length: 7 }, (_, i) => i);
    for (let s = 0; s < 100; s++) {
      const result = seededShuffle(input, `perm-${s}`);
      expect([...result].sort((a, b) => a - b)).toEqual(input);
    }
  });

  it("handles empty and single-element arrays", () => {
    expect(seededShuffle([], "seed")).toEqual([]);
    expect(seededShuffle(["only"], "seed")).toEqual(["only"]);
  });
});
