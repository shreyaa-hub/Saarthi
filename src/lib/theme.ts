export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "saarthi-theme";

// Inlined into a blocking <script> in the root layout so the correct class
// is set before first paint — avoids a flash of the wrong theme on reload.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (stored === "light" || stored === "dark") {
      document.documentElement.classList.add(stored);
    }
  } catch (e) {}
})();
`;

export function getEffectiveTheme(): Theme {
  if (typeof document === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Always "light" on the server (matches THEME_INIT_SCRIPT's default when no
// class is set yet), so ThemeToggle's useSyncExternalStore can render a
// consistent first paint and only pick up the real class after hydration —
// no manual setState-in-effect needed.
export function getServerTheme(): Theme {
  return "light";
}

type Listener = () => void;
let listeners: Listener[] = [];

export function subscribeTheme(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyThemeChange() {
  listeners.forEach((l) => l());
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode, etc.) — theme still applies for
    // this page load, it just won't persist across reloads.
  }
  notifyThemeChange();
}

export function toggleTheme(): Theme {
  const next: Theme = getEffectiveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
