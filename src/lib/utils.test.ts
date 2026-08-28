import { describe, it, expect } from "vitest";
import { formatAttemptResult } from "@/lib/utils";

// How a completed activity reads in every list. The case that matters is an
// activity with nothing to mark: it used to render "0/0 (100%)", which told a
// clinician a patient had scored perfectly on an assessment that never
// happened.
describe("formatAttemptResult", () => {
  it("says so rather than claiming a perfect score when nothing was markable", () => {
    expect(formatAttemptResult(0, 0, 100)).toBe("Not scored");
    expect(formatAttemptResult(0, 0, null)).toBe("Not scored");
  });

  it("reads a real result normally", () => {
    expect(formatAttemptResult(8, 10, 80)).toBe("8/10 (80%)");
    expect(formatAttemptResult(0, 4, 0)).toBe("0/4 (0%)");
    expect(formatAttemptResult(4, 4, 100)).toBe("4/4 (100%)");
  });

  it("derives the percentage when the stored score is missing", () => {
    // Rows written before the score column was populated, and any row where
    // it is null for another reason, must still read correctly.
    expect(formatAttemptResult(1, 3, null)).toBe("1/3 (33%)");
  });

  it("prefers the stored score, which is the number of record", () => {
    // If the two ever disagree, the figure the clinician sees should be the
    // one actually saved against the attempt.
    expect(formatAttemptResult(1, 2, 45)).toBe("1/2 (45%)");
  });
});
