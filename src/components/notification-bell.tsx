"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { notificationsInserted, notificationsUpdated } from "@/lib/realtime/messaging-dispatcher";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

// Single reconciliation path for "a notification row was inserted or
// updated" — used by BOTH the user's own optimistic actions
// (openNotification, markAllRead) AND the Realtime echoes of those same
// actions, so neither can double-count against the other. Two
// independently-written reconciliation paths (an optimistic click vs. the
// Realtime echo of that same click) are exactly what would drift apart
// here if unreadCount were decremented once at the click site and again
// when the echo of that click arrives — the same class of bug as
// MessageThread's duplicate-message handling, fixed the same way: one
// shared, idempotent function for both paths.
//
// New notification (id not already held): always unread —
// notify_new_message()'s ON CONFLICT ... WHERE read_at IS NULL DO UPDATE
// means a coalesced repeat reuses the same id; a genuinely new id only
// ever appears when there was no existing unread match, so it's never
// anything but unread on arrival. Evicts the oldest row past 20 to match
// getMyNotifications()'s own limit.
//
// Existing notification: the unread delta is computed by comparing this
// row's OLD locally-held read_at against the INCOMING read_at, not a
// hardcoded +1/-1 at the call site — so whichever of "my own click" or
// "the Realtime echo of that click" applies second sees the state its
// own update already produced and correctly computes a zero delta,
// instead of double-decrementing. This also means the incoming row
// (always the server's real values) fully replaces the local one, which
// incidentally corrects openNotification's client-fabricated read_at
// guess below (a provisional value, same pattern as MessageThread's
// client-fabricated edited_at) once the echo arrives.
//
// unreadCount is deliberately NOT derived from notifications.length here
// (unlike, say, a simple filter().length) — this list is capped at the
// most recent 20 (getMyNotifications()'s limit), while unreadCount's
// baseline (getUnreadNotificationCount) is an unbounded COUNT() that can
// legitimately exceed 20. Deriving from the visible list would silently
// undercount for a user with more than 20 unread notifications; tracking
// it as its own delta-adjusted value, seeded from the accurate server
// count, avoids that.
function upsertNotification(
  prev: NotificationRow[],
  incoming: NotificationRow,
): { notifications: NotificationRow[]; unreadDelta: number } {
  const idx = prev.findIndex((n) => n.id === incoming.id);

  if (idx === -1) {
    const next = [incoming, ...prev];
    if (next.length > 20) next.pop();
    return { notifications: next, unreadDelta: 1 };
  }

  const wasUnread = prev[idx].read_at === null;
  const isUnread = incoming.read_at === null;
  const next = [...prev];
  next[idx] = incoming;
  return { notifications: next, unreadDelta: wasUnread === isUnread ? 0 : isUnread ? 1 : -1 };
}

export function NotificationBell({
  userId,
  initialNotifications,
  initialUnreadCount,
}: {
  userId: string;
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [prevInitialNotifications, setPrevInitialNotifications] = useState(initialNotifications);
  const [, startTransition] = useTransition();

  // Re-seeds from fresh server props whenever they arrive — the same
  // reconciliation-to-server-truth pattern ConversationList uses: both
  // markNotificationRead and markAllNotificationsRead call revalidatePath,
  // which refreshes this user's own mounted layout — including these
  // props — on every click, not just on a full reload. Without this, any
  // drift between live-patched state and server truth (a missed event, an
  // ordering quirk, a different conversation's notification cleared via
  // markConversationRead) has no self-correction, unlike everywhere else
  // in this design. Uses React's documented "adjust state during render"
  // pattern (guarded by reference comparison), not a useEffect mirroring
  // the props, to avoid an extra render pass and the project's
  // set-state-in-effect lint rule.
  if (initialNotifications !== prevInitialNotifications) {
    setPrevInitialNotifications(initialNotifications);
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }

  // Live updates. The provider's notifications channel is already
  // filtered server-side to user_id=eq.<this user>, so the row.user_id
  // check below is belt-and-suspenders, not duplicated authorization
  // logic.
  useEffect(() => {
    const applyLive = (row: NotificationRow) => {
      if (row.user_id !== userId) return;
      setNotifications((prev) => {
        const { notifications: next, unreadDelta } = upsertNotification(prev, row);
        if (unreadDelta !== 0) setUnreadCount((c) => Math.max(0, c + unreadDelta));
        return next;
      });
    };

    const unsubscribeInsert = notificationsInserted.subscribe(applyLive);
    const unsubscribeUpdate = notificationsUpdated.subscribe(applyLive);
    return () => {
      unsubscribeInsert();
      unsubscribeUpdate();
    };
  }, [userId]);

  const openNotification = (n: NotificationRow) => {
    if (!n.read_at) {
      const optimistic = { ...n, read_at: new Date().toISOString() };
      setNotifications((prev) => {
        const { notifications: next, unreadDelta } = upsertNotification(prev, optimistic);
        if (unreadDelta !== 0) setUnreadCount((c) => Math.max(0, c + unreadDelta));
        return next;
      });
      startTransition(() => {
        void markNotificationRead(n.id);
      });
    }
    if (n.link) router.push(n.link);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    startTransition(() => {
      void markAllNotificationsRead(userId);
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          title="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <BellOff className="size-5" />
              Nothing here yet.
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted cursor-pointer",
                  !n.read_at && "bg-secondary/60",
                )}
              >
                <div className="flex items-center gap-2">
                  {!n.read_at && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
                  <p className="truncate text-sm font-medium">{n.title}</p>
                </div>
                {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                <p className="text-[11px] text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
