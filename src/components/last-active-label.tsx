"use client";

import { useLiveTimestamp } from "@/lib/time/use-live-timestamp";
import { TimeLabel } from "@/components/time-label";

// Small client boundary for the "Active {time}" indicator used in the
// conversation header (conversation-detail-pane.tsx, patient messages
// page): both call sites are Server Components, so the live-updating
// hook can't run there directly — this isolates the one part of that
// header that needs to be a Client Component, without converting the
// whole page/pane.
//
// Uses the same live list-style ladder as the conversation list and
// notifications (Just now → clock time → date ladder): the underlying
// lastReadAt value itself only refreshes on the next server render (it
// has no live push), but the *label* for a fixed value should still keep
// advancing correctly for as long as the viewer stays on the page — e.g.
// a value that's 55s old at page load must become a clock time a few
// seconds later, not stay frozen at "Just now" indefinitely.
export function LastActiveLabel({ lastReadAt }: { lastReadAt: string }) {
  const timestamp = useLiveTimestamp(lastReadAt);
  return (
    <>
      Active <TimeLabel timestamp={timestamp} />
    </>
  );
}
