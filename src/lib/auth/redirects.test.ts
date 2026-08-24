import { describe, it, expect } from "vitest";
import { safeRedirect } from "@/lib/auth/redirects";

// safeRedirect is the only thing standing between two user-supplied query
// parameters (?redirect= on sign-in, ?next= on the email-link handler) and a
// redirect the app performs on the visitor's behalf. Both parameters are
// written by whoever composed the URL, which for a link in an email is not
// necessarily us. So the interesting cases here are all the shapes that look
// like a path but are not one.
describe("safeRedirect", () => {
  it("keeps a same-origin absolute path", () => {
    expect(safeRedirect("/clinician/studio")).toBe("/clinician/studio");
  });

  it("keeps a path with a query string and fragment", () => {
    expect(safeRedirect("/patient/progress?range=90d#top")).toBe("/patient/progress?range=90d#top");
  });

  it("rejects an absolute URL on another origin", () => {
    expect(safeRedirect("https://evil.example/harvest")).toBeNull();
  });

  it("rejects a protocol-relative URL", () => {
    // The dangerous one: it starts with "/" so a naive check passes it, but a
    // browser reads "//evil.example" as a host, not a path.
    expect(safeRedirect("//evil.example")).toBeNull();
    expect(safeRedirect("//evil.example/clinician")).toBeNull();
  });

  it("rejects a relative path", () => {
    // Resolves against whatever the current path happens to be, so where it
    // lands depends on the page it was read on.
    expect(safeRedirect("clinician/studio")).toBeNull();
    expect(safeRedirect("../admin")).toBeNull();
  });

  it("rejects a scheme that is not http", () => {
    expect(safeRedirect("javascript:alert(1)")).toBeNull();
    expect(safeRedirect("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("treats absent, empty, and null as no destination", () => {
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect("")).toBeNull();
  });
});
