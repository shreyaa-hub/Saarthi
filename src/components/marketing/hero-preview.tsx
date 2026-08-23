import { Type, ImageIcon, Volume2, ListChecks, MousePointerClick, Square } from "lucide-react";

const paletteItems = [Type, ImageIcon, Square, Volume2, ListChecks, MousePointerClick];

export function HeroPreview() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-4xl">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,_var(--secondary),_transparent_55%)] blur-2xl"
      />
      <div className="animate-float-soft overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* fake browser chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-accent/60" />
          <span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 truncate rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
            verbalcoach.app/clinician/studio
          </span>
        </div>

        {/* mock studio layout */}
        <div className="grid grid-cols-[56px_1fr_140px] gap-3 bg-muted/30 p-3 sm:grid-cols-[72px_1fr_180px] sm:gap-4 sm:p-4">
          {/* palette */}
          <div className="grid grid-cols-2 content-start gap-2 rounded-lg border border-border bg-card p-2">
            {paletteItems.map((Icon, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-md border border-border bg-secondary text-primary"
              >
                <Icon className="size-3.5 sm:size-4" />
              </div>
            ))}
          </div>

          {/* canvas */}
          <div className="canvas-surface relative min-h-56 rounded-lg border border-border bg-background p-3 sm:min-h-72 sm:p-5">
            <div className="h-4 w-28 rounded bg-foreground/15 sm:h-5 sm:w-40" />
            <div className="mt-2 h-2.5 w-20 rounded bg-foreground/10 sm:w-28" />

            <div className="mt-4 flex flex-wrap gap-3 sm:mt-6 sm:gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-secondary sm:h-24 sm:w-24">
                <ImageIcon className="size-6 text-primary/60 sm:size-7" />
              </div>

              <div className="flex min-w-40 flex-1 flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 shadow-sm sm:p-3">
                <div className="h-2.5 w-24 rounded bg-foreground/15" />
                <div className="relative flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-2 py-1.5">
                  <span className="relative flex size-3 shrink-0">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex size-3 rounded-full bg-success" />
                  </span>
                  <span className="h-2 w-16 rounded bg-success/40" />
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5">
                  <span className="size-3 shrink-0 rounded-full border border-muted-foreground/40" />
                  <span className="h-2 w-20 rounded bg-foreground/10" />
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5">
                  <span className="size-3 shrink-0 rounded-full border border-muted-foreground/40" />
                  <span className="h-2 w-12 rounded bg-foreground/10" />
                </div>
              </div>
            </div>

            <div className="mt-3 h-7 w-24 rounded-md bg-primary/90 sm:mt-4 sm:h-8 sm:w-28" />
          </div>

          {/* properties panel */}
          <div className="hidden flex-col gap-2.5 rounded-lg border border-border bg-card p-3 sm:flex">
            <div className="h-2 w-16 rounded bg-foreground/15" />
            <div className="h-6 rounded-md border border-border bg-background" />
            <div className="h-2 w-20 rounded bg-foreground/15" />
            <div className="h-6 rounded-md border border-border bg-background" />
            <div className="h-2 w-14 rounded bg-foreground/15" />
            <div className="flex gap-1.5">
              <div className="size-6 rounded-md bg-primary" />
              <div className="size-6 rounded-md bg-accent" />
              <div className="size-6 rounded-md bg-secondary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
