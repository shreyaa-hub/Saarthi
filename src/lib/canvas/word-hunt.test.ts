import { describe, it, expect } from "vitest";
import { tokenizeWordHunt, isWordToken, targetTokenIndices } from "@/lib/canvas/word-hunt";

describe("tokenizeWordHunt", () => {
  it("splits into alternating word and non-word chunks", () => {
    expect(tokenizeWordHunt("The cat sat.")).toEqual(["The", " ", "cat", " ", "sat", "."]);
  });

  it("reconstructs the exact original passage when joined", () => {
    const passage = "Sam's sunglasses  sat  on the soft, warm grass.";
    expect(tokenizeWordHunt(passage).join("")).toBe(passage);
  });

  it("keeps a contraction as one token", () => {
    expect(tokenizeWordHunt("Sam's")).toEqual(["Sam's"]);
  });

  it("returns an empty array for an empty passage", () => {
    expect(tokenizeWordHunt("")).toEqual([]);
  });
});

describe("isWordToken", () => {
  it("is true for letters and false for punctuation or whitespace", () => {
    expect(isWordToken("Sun")).toBe(true);
    expect(isWordToken(" ")).toBe(false);
    expect(isWordToken(".")).toBe(false);
    expect(isWordToken("")).toBe(false);
  });
});

describe("targetTokenIndices", () => {
  const tokens = tokenizeWordHunt("Sam sat on the sofa with his sunglasses.");
  // ["Sam", " ", "sat", " ", "on", " ", "the", " ", "sofa", " ", "with", " ", "his", " ", "sunglasses", "."]

  it("matches target words case-insensitively", () => {
    const targets = targetTokenIndices(tokens, ["sam", "SOFA"]);
    expect(tokens[[...targets].sort((a, b) => a - b)[0]]).toBe("Sam");
    expect(targets.size).toBe(2);
  });

  it("never matches a non-word token even if it collides with a target string", () => {
    const targets = targetTokenIndices(tokens, [" ", "."]);
    expect(targets.size).toBe(0);
  });

  it("ignores blank or whitespace-only target words", () => {
    const targets = targetTokenIndices(tokens, ["sam", "   ", ""]);
    expect(targets.size).toBe(1);
  });

  it("matches every occurrence of a repeated target", () => {
    const repeated = tokenizeWordHunt("sun sun sun");
    const targets = targetTokenIndices(repeated, ["sun"]);
    expect(targets.size).toBe(3);
  });
});
