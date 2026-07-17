"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime, initials } from "@/lib/utils";
import type { InboxRow } from "@/lib/data/messages";

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
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.patientName.toLowerCase().includes(q) ||
        (r.patientEmail?.toLowerCase().includes(q) ?? false) ||
        (r.lastMessagePreview?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, query]);

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
            {rows.length === 0 ? "No active patients yet." : "No matches."}
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
