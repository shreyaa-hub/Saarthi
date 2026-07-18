"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

// Opens the two feature-scoped Realtime channels for this user and emits
// every event into the plain pub/sub topics in messaging-dispatcher.ts —
// this component owns channel lifecycle only, never the events' meaning.
// Connection-status logging (the .subscribe() callbacks below) stays as
// plain console.log — low-noise diagnostic info, not a per-message event
// any consumer needs.
//
// Mounted once per shell layout (clinician/layout.tsx, patient/layout.tsx),
// not per page and not per component: the unread badge needs coverage on
// every route in the shell, and a signed-in user is inside exactly one
// shell per tab, so this is "one dispatcher per tab" by construction, not
// a global/app-wide provider.
//
// messages channel: deliberately NO conversation_id filter — delivery is
// scoped entirely by messages_participant_select RLS, which Realtime
// evaluates per-subscriber before broadcasting (see the Realtime
// publication comment in 0001_init.sql). This is the one assumption the
// whole no-filter architecture depends on, and it has not been
// empirically verified against a real Supabase project. Manual testing
// must include: sign in as a user with no conversation in common with
// whoever is generating test messages, and confirm nothing ever logs on
// their messages channel for those messages. If that check ever shows an
// unauthorized delivery, stop immediately and fall back to explicit
// conversation_id=in.(...) filtering.
export function MessagingRealtimeProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // Reconnect reconciliation. postgres_changes is fire-and-forget — there
    // is no server-side queue and no per-client delivery tracking (verified
    // against Supabase's own docs and https://github.com/supabase/realtime/
    // discussions/21093), so any event whose INSERT/UPDATE lands on the
    // server while this tab's socket is disconnected is gone for that tab,
    // permanently — it will never be redelivered on reconnect. Most of this
    // app's live surfaces (ConversationList, NotificationBell, both
    // Sidebars) already self-heal from that gap on the user's own next
    // action, because they each reconcile against a fresh server-fetched
    // prop (see their "adjust state during render" logic). MessageThread's
    // `messages` state has no equivalent path — a fresh `initialMessages`
    // prop is only consulted by useState's initializer on first mount, so
    // without this, a message sent by the other party during a disconnect
    // gap would never appear in an already-open thread, and nothing the
    // user does afterward would surface it (see mergeMessages in
    // message-thread.tsx, the other half of this fix).
    //
    // hasDisconnected only turns true on a REAL disconnect of an
    // already-established channel (see hasEverSubscribed below for why
    // "already-established" matters) — so an ordinary first connection
    // never triggers a refresh. debounceTimer collapses a flapping
    // connection (repeated drop/reconnect cycles) into a single trailing
    // router.refresh() instead of one per cycle.
    let hasDisconnected = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    // Per-channel, not shared: @supabase/realtime-js's `_onClose`/
    // `_onError` are raw socket-level listeners, registered unconditionally
    // at subscribe() time — they fire CLOSED/CHANNEL_ERROR for a connection
    // hiccup during a channel's very first join attempt just as readily as
    // for losing an already-established connection. Without this guard, a
    // transient failure before any SUBSCRIBED has ever been reached would
    // be treated as "recovered from a disconnect" once the retry succeeds,
    // firing a router.refresh() on ordinary page-load network flakiness —
    // there was never a live subscription for events to have been missed
    // from, so nothing needs reconciling.
    const hasEverSubscribed: Record<string, boolean> = { messages: false, notifications: false };

    function handleStatus(channelLabel: "messages" | "notifications") {
      return (status: string, err?: Error) => {
        console.log(`[realtime:${channelLabel}:status]`, status, err ?? "");

        if (status === "SUBSCRIBED") {
          const isFirstJoin = !hasEverSubscribed[channelLabel];
          hasEverSubscribed[channelLabel] = true;
          if (isFirstJoin) return;

          if (hasDisconnected) {
            hasDisconnected = false;
            if (debounceTimer) clearTimeout(debounceTimer);
            // 2s debounce: both channels reconnecting around the same time
            // (the common case — one network blip affects both sockets)
            // should produce one refresh, not two.
            debounceTimer = setTimeout(() => {
              debounceTimer = null;
              router.refresh();
            }, 2000);
          }
          return;
        }

        if (status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR") {
          if (hasEverSubscribed[channelLabel]) {
            hasDisconnected = true;
          }
        }
      };
    }

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
            // A message from someone else, for a conversation the current
            // tab doesn't have open right now, is unread — increment. Own
            // sends never count (matches
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
        .subscribe(handleStatus("messages"));

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
        .subscribe(handleStatus("notifications"));

      channelsRef.current = [messagesChannel, notificationsChannel];
    }

    void setup();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [userId, router]);

  return <>{children}</>;
}
