"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  messagesInserted,
  messagesUpdated,
  notificationsInserted,
  notificationsUpdated,
  conversationUnreadIncremented,
  isConversationActive,
} from "@/lib/realtime/messaging-dispatcher";
import type { Database } from "@/lib/types/database";
import type { RealtimeChannel, RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload } from "@supabase/supabase-js";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

// Step 5. Opens the two feature-scoped Realtime channels and emits every
// event into the plain pub/sub topics in messaging-dispatcher.ts — this
// component owns channel lifecycle only, never the events' meaning.
// Phase 1 shipped this scaffolding with the emit target being
// console.log; Phase 2 (current) wires the four handlers below to the
// real dispatcher, whose topics MessageThread is now the first
// subscriber of (later phases: the conversation list, NotificationBell).
// Connection-status logging (the .subscribe((status) => ...) calls below)
// stays as plain console.log — low-noise diagnostic info, not a
// per-message event any consumer needs.
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
    let cancelled = false;
    const supabase = createClient();

    async function setup() {
      // Explicitly sets Realtime's auth before subscribing, rather than
      // relying on supabase-js's automatic wiring: SupabaseClient only
      // pushes a fresh token to the Realtime socket on
      // 'TOKEN_REFRESHED'/'SIGNED_IN' auth events (see
      // node_modules/@supabase/supabase-js SupabaseClient._handleTokenChanged),
      // never on 'INITIAL_SESSION' — the event that fires for a user who
      // was already signed in before this component mounted, which is the
      // common case here. Without this, channels can reach SUBSCRIBED
      // while still evaluating RLS as unauthenticated (auth.uid() null),
      // silently delivering nothing — confirmed as the root cause of an
      // earlier zero-delivery bug in this phase.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.realtime.setAuth(session.access_token);
      } else {
        console.warn("[realtime] no auth session found — channels will subscribe unauthenticated");
      }

      if (cancelled) return;

      const messagesChannel = supabase
        .channel(`messaging-messages-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: RealtimePostgresInsertPayload<MessageRow>) => {
            messagesInserted.emit(payload.new);
            // Step 5, Phase 5: a message from someone else, for a
            // conversation the current tab doesn't have open right now,
            // is unread — increment. Own sends never count (matches
            // computeUnreadCounts()'s existing sender_id exclusion); a
            // conversation actively open in MessageThread is suppressed
            // here rather than incremented-then-immediately-cleared, to
            // avoid a visible flash of the badge.
            if (payload.new.sender_id !== userId && !isConversationActive(payload.new.conversation_id)) {
              conversationUnreadIncremented.emit(payload.new.conversation_id);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload: RealtimePostgresUpdatePayload<MessageRow>) => {
            messagesUpdated.emit(payload.new);
          },
        )
        .subscribe((status, err) => {
          console.log("[realtime:messages:status]", status, err ?? "");
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
          (payload: RealtimePostgresInsertPayload<NotificationRow>) => {
            notificationsInserted.emit(payload.new);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload: RealtimePostgresUpdatePayload<NotificationRow>) => {
            notificationsUpdated.emit(payload.new);
          },
        )
        .subscribe((status, err) => {
          console.log("[realtime:notifications:status]", status, err ?? "");
        });

      channelsRef.current = [messagesChannel, notificationsChannel];
    }

    void setup();

    return () => {
      cancelled = true;
      channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [userId]);

  return <>{children}</>;
}
