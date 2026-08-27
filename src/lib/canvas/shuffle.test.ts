import { describe, it, expect } from "vitest";
import { shuffle } from "@/lib/canvas/shuffle";

// Randomness makes "the order actually changed" untestable without flaking
// (a shuffle can legitimately return the original order), so these check
// the properties that must hold on every call instead: same elements, same
// count, and the input untouched.
describe("shuffle", () => {
  it("returns every input element exactly once", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty array", () => {
    expect(shuffle([])).toEqual([]);
  });

  it("handles a single element", () => {
    expect(shuffle(["only"])).toEqual(["only"]);
  });
});
