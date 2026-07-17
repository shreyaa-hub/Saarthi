// Route-level Suspense fallback for the detail pane only — the list (in
// messages/layout.tsx) stays mounted and interactive while a specific
// conversation loads. Mirrors the final pane's proportions (header row,
// flex-1 panel, composer bar) so nothing shifts when real content swaps in.
export default function ClinicianMessageThreadLoading() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="size-9 animate-pulse rounded-full bg-muted" />
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1" />
        <div className="border-t border-border p-3">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
