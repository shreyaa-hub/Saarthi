"use client";

import { useCallback, useSyncExternalStore } from "react";

// Fullscreen state, read straight from the document rather than mirrored into
// React state.
//
// useSyncExternalStore rather than useState + useEffect for two reasons: the
// browser is the source of truth (the user can leave fullscreen with Escape
// or the system chrome, which no click handler of ours ever sees), and this
// repo lints against setState-in-effect, which the mirror-into-state version
// requires.
//
// getServerSnapshot returns false so the server renders the "not fullscreen"
// button, which is what the client renders first too — no hydration mismatch.

function subscribe(onChange: () => void): () => void {
  document.addEventListener("fullscreenchange", onChange);
  // Safari still only fires the webkit-prefixed event.
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
}

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const d = document as WebkitDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

function isFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as WebkitElement;
  return (
    Boolean(document.fullscreenEnabled) &&
    typeof (el.requestFullscreen ?? el.webkitRequestFullscreen) === "function"
  );
}

// Support never changes for the life of the page, so there is nothing to
// listen to — this exists only to satisfy useSyncExternalStore's contract.
function isSupportedSubscribe(): () => void {
  return () => {};
}

export function useFullscreen(): {
  isFullscreen: boolean;
  supported: boolean;
  toggle: (target?: HTMLElement | null) => void;
} {
  const isFullscreen = useSyncExternalStore(
    subscribe,
    () => fullscreenElement() !== null,
    () => false,
  );

  // Also through useSyncExternalStore, not a plain `typeof document` check at
  // render time. That check is false on the server and true in the browser,
  // which is a hydration mismatch: the server sends no button, the client's
  // first render wants one, and React tears down the tree. This hook is the
  // supported way to say "the value differs between server and client" —
  // getServerSnapshot is used for SSR *and* for the hydrating render, so the
  // markup agrees, and React re-renders afterwards if the real value differs.
  //
  // Worth having: iOS Safari genuinely has no element fullscreen, so this is
  // not a theoretical branch, and a button that silently did nothing there
  // would be worse than no button.
  const supported = useSyncExternalStore(isSupportedSubscribe, isFullscreenSupported, () => false);

  const toggle = useCallback((target?: HTMLElement | null) => {
    const d = document as WebkitDocument;
    if (fullscreenElement()) {
      // Fullscreen requests reject rather than throw synchronously (a
      // browser can refuse one outside a user gesture); swallow it so a
      // refusal never surfaces as an unhandled rejection.
      void Promise.resolve(d.exitFullscreen?.() ?? d.webkitExitFullscreen?.()).catch(() => {});
      return;
    }
    const el = (target ?? document.documentElement) as WebkitElement;
    void Promise.resolve(el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.()).catch(() => {});
  }, []);

  return { isFullscreen, supported, toggle };
}
