import type { TemplateCanvas } from "@/lib/types/canvas";

// A canvas built by someone who isn't signed in yet. Held in localStorage so
// it survives the round trip through sign-up — the whole point of letting
// people try the Studio first is that they don't lose the thing they made
// when they finally create an account.
export const GUEST_DRAFT_KEY = "verbalcoach-guest-draft";

// The key this used to live under, before the product was renamed. A guest
// draft is somebody's unsaved work, so the rename must not throw it away:
// reads fall back to the old key, and the next write or clear removes it.
// Reads deliberately do NOT migrate, because getGuestDraftRaw is a
// useSyncExternalStore snapshot and writing to storage during render is a
// side effect in the wrong place.
const LEGACY_GUEST_DRAFT_KEY = "saarthi-guest-draft";

export type GuestDraft = {
  title: string;
  domain: string;
  canvas: TemplateCanvas;
  savedAt: string;
};

// Subscription plumbing so components can read the draft with
// useSyncExternalStore rather than setState-in-an-effect. getRaw returns a
// primitive string (or null), which React compares by value — so a snapshot
// that hasn't changed doesn't loop.
type Listener = () => void;
let listeners: Listener[] = [];

export function subscribeGuestDraft(listener: Listener) {
  listeners.push(listener);
  if (typeof window !== "undefined") {
    // Another tab editing the same draft should update this one too.
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", listener);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function getGuestDraftRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.localStorage.getItem(GUEST_DRAFT_KEY) ??
      window.localStorage.getItem(LEGACY_GUEST_DRAFT_KEY)
    );
  } catch {
    return null;
  }
}

// Always null on the server: localStorage does not exist there, and claiming
// otherwise would desync the server and client renders.
export function getGuestDraftServerSnapshot(): string | null {
  return null;
}

export function parseGuestDraft(raw: string | null): GuestDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuestDraft;
    if (!parsed?.canvas || !Array.isArray(parsed.canvas.elements)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readGuestDraft(): GuestDraft | null {
  return parseGuestDraft(getGuestDraftRaw());
}

// Returns whether the draft actually persisted. The caller MUST NOT report
// "saved" without checking: localStorage has a hard quota (~5MB in practice),
// and a large pasted data-URI image can exceed it. Swallowing that error
// would leave the editor claiming the work was safe while every write failed
// and the whole draft vanished on reload — silent data loss, which is worse
// than telling someone their page is too big.
export type GuestWriteResult = { ok: true } | { ok: false; reason: "quota" | "unavailable" };

export function writeGuestDraft(draft: Omit<GuestDraft, "savedAt">): GuestWriteResult {
  if (typeof window === "undefined") return { ok: false, reason: "unavailable" };
  try {
    window.localStorage.setItem(
      GUEST_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
    );
    // Only once the new key holds the draft, so a failed write above never
    // destroys the old copy on its way out.
    window.localStorage.removeItem(LEGACY_GUEST_DRAFT_KEY);
    notify();
    return { ok: true };
  } catch (err) {
    // QuotaExceededError is the interesting one; anything else (private mode,
    // storage disabled by policy) is reported as simply unavailable.
    const quota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return { ok: false, reason: quota ? "quota" : "unavailable" };
  }
}

export function clearGuestDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_DRAFT_KEY);
    window.localStorage.removeItem(LEGACY_GUEST_DRAFT_KEY);
    notify();
  } catch {
    // Nothing to do — a draft we can't clear is re-offered once more at
    // worst, which is harmless.
  }
}
