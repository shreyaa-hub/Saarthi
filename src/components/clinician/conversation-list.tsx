"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime, initials } from "@/lib/utils";
import { messagesInserted } from "@/lib/realtime/messaging-dispatcher";
import { compareInboxRows, type InboxRow } from "@/lib/data/messages";

// message_type/sender_id distinctions belong to MessageThread's rendering
// only — here this is purely a label prefix for scanning a list, not a
// business-logic branch. lastMessageSenderId is null both when there's no
// message yet and when the last message was a SYSTEM row (sender_id is
// null by design); either way, no "You:"/"Patient:" prefix makes sense.
function previewText(row: InboxRow, currentUserId: string) {
  if (!row.lastMessagePreview) return "No messages yet";
  if (row.lastMessageSenderId === null) return row.lastMessagePreview;
  const prefix = row.lastMessageSenderId === currentUserId ? "You" : "Patient";
  return `${prefix}: ${row.lastMessagePreview}`;
}

export function ConversationList({ rows, currentUserId }: { rows: InboxRow[]; currentUserId: string }) {
  const [liveRows, setLiveRows] = useState(rows);
  const [prevRows, setPrevRows] = useState(rows);
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  // Re-seeds from the server prop whenever a fresh one arrives, using
  // React's documented "adjusting state during render" pattern (setState
  // called during render, guarded by a reference comparison) rather than
  // a useEffect mirroring the prop — the effect form works but triggers
  // an avoidable extra render pass, which the project's stricter
  // react-hooks lint rule (set-state-in-effect) correctly flags.
  //
  // This isn't just a mount-time initializer: sendMessage()/editMessage()/
  // etc. all call revalidatePath("/clinician", "layout"), and per Next.js
  // Server Actions' integration with revalidatePath, that automatically
  // refreshes the acting user's own currently-mounted layout tree
  // (including this list's messages/layout.tsx parent) in place, without
  // unmounting anything — so a fresh `rows` prop arrives on every one of
  // the clinician's own actions, not just on a full reload. That's the
  // intended reconciliation-to-server-truth path this design has relied
  // on throughout (client-side patches are always provisional; any real
  // fetch is authoritative and fully replaces them) — not a rare edge
  // case to special-case around.
  if (rows !== prevRows) {
    setPrevRows(rows);
    setLiveRows(rows);
  }

  // Live preview/order updates (Step 5, Phase 3). Deliberately subscribes
  // to messagesInserted only, not messagesUpdated: messages_touch_
  // conversation (0001_init.sql) only fires `after insert`, so edits and
  // deletes never change last_message_at/last_message_preview server-side
  // either — reacting to updates here would make this list a *smarter*
  // source of truth than the server row it's mirroring, which the design
  // review deliberately avoided (a deleted latest message keeps showing
  // its old preview until a new message or a real refresh, matching
  // getClinicianInbox()'s own behavior exactly).
  //
  // A message whose conversation_id has no matching row here is silently
  // ignored — this happens when the other party starts a conversation
  // for the first time during this session; fabricating a new row would
  // need the patient's name/email, which a bare message payload doesn't
  // carry. That row appears on the next real fetch (the effect above),
  // same as it would have before Phase 3.
  useEffect(() => {
    const unsubscribe = messagesInserted.subscribe((row) => {
      setLiveRows((prev) => {
        const idx = prev.findIndex((r) => r.conversationId === row.conversation_id);
        if (idx === -1) return prev;

        const next = [...prev];
        next[idx] = {
          ...next[idx],
          lastMessageAt: row.created_at,
          lastMessagePreview: (row.body ?? "").slice(0, 140),
          lastMessageSenderId: row.sender_id,
        };
        return next.sort(compareInboxRows);
      });
    });

    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return liveRows;
    return liveRows.filter((r) => {
      return (
        r.patientName.toLowerCase().includes(q) ||
        (r.patientEmail?.toLowerCase().includes(q) ?? false) ||
        (r.lastMessagePreview?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [liveRows, query]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or message…"
            aria-label="Search conversations"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {liveRows.length === 0 ? "No active patients yet." : "No matches."}
          </p>
        ) : (
          filtered.map((row) => {
            const href = `/clinician/messages/${row.clinicianPatientId}`;
            const active = pathname === href;
            return (
              <Link
                key={row.clinicianPatientId}
                href={href}
                className={cn(
                  "flex items-start gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted",
                  active && "bg-secondary",
                )}
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback>{initials(row.patientName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{row.patientName}</p>
                    {row.lastMessageAt && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(row.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {previewText(row, currentUserId)}
                    </p>
                    {row.unreadCount > 0 && (
                      <Badge variant="accent" className="shrink-0 px-1.5 py-0">
                        {row.unreadCount > 9 ? "9+" : row.unreadCount}
                        <span className="sr-only"> unread</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
