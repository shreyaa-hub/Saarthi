"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

// Step 5, Phase 1 — infrastructure scaffolding only. Opens the two
// feature-scoped Realtime channels the design calls for and logs every
// event to the console; nothing here fans events out to MessageThread,
// the conversation list, or NotificationBell yet — none of them consume
// this provider's output. That wiring is Phase 2+, added once there's a
// real consumer, rather than building an unused dispatcher API now.
//
// Mounted once per shell layout (clinician/layout.tsx, patient/layout.tsx),
// not per page and not per component — see the Step 5 design review for
// why the shell is the right scope (the eventual unread badge needs
// coverage on every route in the shell, and a signed-in user is inside
// exactly one shell per tab, so this is "one dispatcher per tab" by
// construction, not a global/app-wide provider).
//
// messages channel: deliberately NO conversation_id filter — delivery is
// scoped entirely by messages_participant_select RLS, which Realtime
// evaluates per-subscriber before broadcasting (see the Realtime
// publication comment in 0001_init.sql). This is the one assumption the
// whole no-filter architecture depends on.
//
// KNOWN GAP: verify-realtime-rls.mjs (the standalone script written to
// empirically test that assumption against a real Supabase project) was
// NOT run before this phase shipped — explicitly waived by the project
// owner, who accepted the risk in order to proceed. Manual testing after
// this phase must specifically include the case that script would have
// covered: sign in as a user with no conversation in common with whoever
// is generating test messages, and confirm nothing ever logs on their
// messages channel for those messages. If that check ever shows an
// unauthorized delivery, stop immediately — see the design review's
// fallback (explicit conversation_id=in.(...) filtering).
export function MessagingRealtimeProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const messagesChannel = supabase
      .channel(`messaging-messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          console.log("[realtime:messages:insert]", payload.new);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          console.log("[realtime:messages:update]", payload.new);
        },
      )
      .subscribe((status) => {
        console.log("[realtime:messages:status]", status);
      });

    // Unlike the messages channel, this filter is kept explicitly rather
    // than relying on RLS alone — user_id is a static value that never
    // needs to grow/change for this user's session, so there's no reason
    // to drop it the way the messages channel's filter was dropped.
    const notificationsChannel = supabase
      .channel(`messaging-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          console.log("[realtime:notifications:insert]", payload.new);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          console.log("[realtime:notifications:update]", payload.new);
        },
      )
      .subscribe((status) => {
        console.log("[realtime:notifications:status]", status);
      });

    channelsRef.current = [messagesChannel, notificationsChannel];

    return () => {
      channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [userId]);

  return <>{children}</>;
}
