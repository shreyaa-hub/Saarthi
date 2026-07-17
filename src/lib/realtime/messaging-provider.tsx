"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { messagesInserted, messagesUpdated, notificationsInserted, notificationsUpdated } from "@/lib/realtime/messaging-dispatcher";
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
      // DIAGNOSTIC (temporary — investigating reported zero-delivery bug):
      // supabase-js's own automatic wiring only pushes a fresh token to the
      // Realtime socket on 'TOKEN_REFRESHED'/'SIGNED_IN' auth events (see
      // node_modules/@supabase/supabase-js SupabaseClient._handleTokenChanged),
      // NOT on 'INITIAL_SESSION' — the event that actually fires for a user
      // who was already signed in before this component ever mounted, which
      // is the overwhelmingly common case here. There is a separate,
      // connect-time auth path in realtime-js, but its timing relative to
      // this channel's subscribe() call is not something to assume works
      // without checking — so this sets auth explicitly and unconditionally
      // before creating either channel, rather than relying on either
      // automatic path.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log("[realtime:DEBUG] session present before subscribing:", !!session, "expires_at:", session?.expires_at);

      if (session) {
        await supabase.realtime.setAuth(session.access_token);
        console.log("[realtime:DEBUG] realtime.setAuth() completed");
      } else {
        console.warn("[realtime:DEBUG] no session found — channels will subscribe unauthenticated");
      }

      if (cancelled) return;

      const messagesChannel = supabase
        .channel(`messaging-messages-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: RealtimePostgresInsertPayload<MessageRow>) => {
            console.log("[realtime:DEBUG] messages INSERT callback fired", payload.new.id, payload.new.conversation_id);
            messagesInserted.emit(payload.new);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload: RealtimePostgresUpdatePayload<MessageRow>) => {
            console.log("[realtime:DEBUG] messages UPDATE callback fired", payload.new.id, payload.new.conversation_id);
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
            console.log("[realtime:DEBUG] notifications INSERT callback fired", payload.new.id);
            notificationsInserted.emit(payload.new);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload: RealtimePostgresUpdatePayload<NotificationRow>) => {
            console.log("[realtime:DEBUG] notifications UPDATE callback fired", payload.new.id);
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
