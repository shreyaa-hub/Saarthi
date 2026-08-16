import type { TemplateCanvas } from "@/lib/types/canvas";

// A canvas built by someone who isn't signed in yet. Held in localStorage so
// it survives the round trip through sign-up — the whole point of letting
// people try the Studio first is that they don't lose the thing they made
// when they finally create an account.
export const GUEST_DRAFT_KEY = "saarthi-guest-draft";

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
    return window.localStorage.getItem(GUEST_DRAFT_KEY);
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
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestDraft;
    // Anything without a usable canvas is treated as absent rather than
    // thrown at the caller — a corrupted or half-written entry must never
    // block sign-in or leave a broken prompt on screen.
    if (!parsed?.canvas || !Array.isArray(parsed.canvas.elements)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGuestDraft(draft: Omit<GuestDraft, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      GUEST_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
    );
    notify();
  } catch {
    // Storage full or blocked (private mode). The canvas is still on screen;
    // it just won't survive a reload, which is better than crashing the
    // editor mid-edit.
  }
}

export function clearGuestDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_DRAFT_KEY);
    notify();
  } catch {
    // Nothing to do — a draft we can't clear is re-offered once more at
    // worst, which is harmless.
  }
}
