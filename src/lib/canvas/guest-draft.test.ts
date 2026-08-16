import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { TemplateCanvas } from "@/lib/types/canvas";

// The module reads `window` at call time, so a fake window is installed before
// each test rather than pulling in a full DOM. The environment is "node", so
// there is no window to conflict with.
const CANVAS: TemplateCanvas = {
  width: 794,
  height: 1123,
  background: "#ffffff",
  elements: [],
};

type FakeStorage = {
  store: Map<string, string>;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
};

function installWindow(setItem?: (k: string, v: string) => void) {
  const store = new Map<string, string>();
  const localStorage: FakeStorage = {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: setItem ?? ((k, v) => void store.set(k, v)),
    removeItem: (k) => void store.delete(k),
  };
  (globalThis as unknown as { window: unknown }).window = {
    localStorage,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  return localStorage;
}

async function freshModule() {
  // Re-imported per test so the module-level listener array doesn't leak
  // between cases.
  vi.resetModules();
  return import("./guest-draft");
}

describe("guest draft storage", () => {
  beforeEach(() => {
    installWindow();
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("round-trips a draft", async () => {
    const { writeGuestDraft, readGuestDraft } = await freshModule();

    const result = writeGuestDraft({ title: "Morning", domain: "General", canvas: CANVAS });
    expect(result.ok).toBe(true);

    const back = readGuestDraft();
    expect(back?.title).toBe("Morning");
    expect(back?.canvas.width).toBe(794);
    expect(back?.savedAt).toBeTruthy();
  });

  // The important one: a quota failure must be reported, not swallowed.
  // Swallowing it lets the editor claim the work is saved while every write
  // fails and the draft is lost on reload.
  it("reports a quota failure instead of silently dropping the draft", async () => {
    installWindow(() => {
      throw new DOMException("exceeded", "QuotaExceededError");
    });
    const { writeGuestDraft } = await freshModule();

    const result = writeGuestDraft({ title: "Too big", domain: "General", canvas: CANVAS });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("quota");
  });

  it("reports other storage failures as unavailable, not as a quota problem", async () => {
    installWindow(() => {
      throw new Error("storage disabled by policy");
    });
    const { writeGuestDraft } = await freshModule();

    const result = writeGuestDraft({ title: "Blocked", domain: "General", canvas: CANVAS });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("unavailable");
  });

  it("treats a corrupted entry as absent rather than throwing", async () => {
    const storage = installWindow();
    const { readGuestDraft, GUEST_DRAFT_KEY } = await freshModule();

    storage.store.set(GUEST_DRAFT_KEY, "{ not json");
    expect(readGuestDraft()).toBeNull();

    // Valid JSON but not a usable canvas — equally unusable, equally absent.
    storage.store.set(GUEST_DRAFT_KEY, JSON.stringify({ title: "x" }));
    expect(readGuestDraft()).toBeNull();
  });

  it("clears the draft", async () => {
    const { writeGuestDraft, clearGuestDraft, readGuestDraft } = await freshModule();

    writeGuestDraft({ title: "Temp", domain: "General", canvas: CANVAS });
    expect(readGuestDraft()).not.toBeNull();

    clearGuestDraft();
    expect(readGuestDraft()).toBeNull();
  });

  it("is inert on the server, where there is no window", async () => {
    delete (globalThis as unknown as { window?: unknown }).window;
    const { readGuestDraft, writeGuestDraft, getGuestDraftServerSnapshot } = await freshModule();

    expect(readGuestDraft()).toBeNull();
    expect(getGuestDraftServerSnapshot()).toBeNull();
    expect(writeGuestDraft({ title: "x", domain: "General", canvas: CANVAS }).ok).toBe(false);
  });
});
