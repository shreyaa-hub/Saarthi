import { describe, it, expect } from "vitest";
import { fitScale } from "@/lib/canvas/fit-scale";

// The one behaviour that matters: fullscreen fills, windowed does not. This is
// what makes "fullscreen shows filler around a small canvas" impossible.
describe("fitScale", () => {
  it("never scales past 1 in a window, even with room to spare", () => {
    // 900x600 canvas in a 1920x1080 window has room to grow, but shouldn't.
    expect(fitScale(1920, 1080, 900, 600, false)).toBe(1);
  });

  it("grows to fill in fullscreen", () => {
    // Same canvas, same space, fullscreen: it should scale up, not stay at 1.
    const s = fitScale(1920, 1080, 900, 600, true);
    expect(s).toBeGreaterThan(1);
    // Bounded by the tighter axis so nothing is cropped: height here.
    // (1080-16)/600 = 1.773, (1920-16)/900 = 2.115 -> min = 1.773.
    expect(s).toBeCloseTo((1080 - 16) / 600, 5);
  });

  it("shrinks to fit when the canvas is bigger than the space, either way", () => {
    // A 1200-wide canvas in an 800-wide box must shrink whether or not it is
    // fullscreen — the cap only ever affects growth.
    expect(fitScale(800, 600, 1200, 900, false)).toBeLessThan(1);
    expect(fitScale(800, 600, 1200, 900, true)).toBeLessThan(1);
  });

  it("is bounded by the constraining axis, so nothing is cropped", () => {
    // Wide canvas, narrow-tall box: width constrains.
    const s = fitScale(400, 2000, 1000, 500, true);
    expect(s).toBeCloseTo((400 - 16) / 1000, 5);
  });

  it("never returns a non-positive or non-finite scale", () => {
    for (const args of [
      [0, 0, 900, 600],
      [100, 100, 0, 0],
      [-50, 100, 900, 600],
      [Number.NaN, 100, 900, 600],
    ] as const) {
      const s = fitScale(args[0], args[1], args[2], args[3], true);
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
    }
  });
});
