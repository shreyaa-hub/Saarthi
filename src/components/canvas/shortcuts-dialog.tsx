"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Ctrl/Cmd + Z", label: "Undo" },
  { keys: "Ctrl/Cmd + Shift + Z", label: "Redo" },
  { keys: "Ctrl/Cmd + D", label: "Duplicate selection" },
  { keys: "Ctrl/Cmd + C / V", label: "Copy / paste selection" },
  { keys: "Delete / Backspace", label: "Delete selection" },
  { keys: "Shift + click", label: "Add/remove from selection" },
  { keys: "Drag on empty canvas", label: "Marquee-select" },
  { keys: "Arrow keys", label: "Nudge selection by 1px" },
  { keys: "Shift + arrow keys", label: "Nudge selection by 10px" },
  { keys: "Ctrl/Cmd + scroll", label: "Zoom in/out" },
  { keys: "?", label: "Show this shortcuts list" },
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Editor shortcuts for the canvas.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
