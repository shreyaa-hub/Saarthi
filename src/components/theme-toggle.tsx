"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { getEffectiveTheme, getServerTheme, subscribeTheme, toggleTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getEffectiveTheme, getServerTheme);

  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className={cn(
        "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer",
        className,
      )}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
