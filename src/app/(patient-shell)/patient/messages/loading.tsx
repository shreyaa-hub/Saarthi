// Route-level Suspense fallback (Next.js convention) shown while the
// conversation/clinician data in page.tsx resolves — mirrors that page's
// final flex proportions (header row, flex-1 panel, composer-shaped bar)
// so nothing shifts when the real content swaps in. Deliberately doesn't
// guess at whether a conversation selector will be shown (rare
// multi-clinician case) — matching the common 0/1-clinician shape exactly
// matters more than covering every case.
export default function PatientMessagesLoading() {
  return (
    <div className="flex h-full flex-col gap-4">
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
