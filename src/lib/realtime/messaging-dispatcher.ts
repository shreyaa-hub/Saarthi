import type { Database } from "@/lib/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

type Listener<T> = (row: T) => void;

// Plain pub/sub, deliberately NOT React state or context — .emit() is a
// synchronous function call over a Set of callbacks, nothing more, so it
// can never trigger a re-render of MessagingRealtimeProvider (the only
// writer) or of anything that hasn't explicitly subscribed. Subscribers
// (MessageThread today; the conversation list and NotificationBell in
// later phases) decide entirely on their own whether a given row turns
// into a setState call — this module has no opinion about React.
function createTopic<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    // Returns the unsubscribe function; callers register it as their
    // useEffect's cleanup so a callback is removed before the owning
    // component finishes unmounting — see messaging-provider.tsx / the
    // Phase 1 review for why that's sufficient to prevent dispatch to a
    // stale/unmounted registration.
    subscribe(listener: Listener<T>): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(row: T) {
      // Iterate a snapshot, not the live Set — protects against a
      // listener that synchronously subscribes/unsubscribes another
      // listener during dispatch (e.g. in response to its own setState).
      for (const listener of Array.from(listeners)) listener(row);
    },
  };
}

export const messagesInserted = createTopic<MessageRow>();
export const messagesUpdated = createTopic<MessageRow>();
export const notificationsInserted = createTopic<NotificationRow>();
export const notificationsUpdated = createTopic<NotificationRow>();

// Step 5, Phase 5 — unread-message badge (sidebar total + ConversationList
// per-row). Two events, both carrying a bare conversation_id rather than a
// full row, since neither Sidebar nor ConversationList need anything more
// than "this conversation's unread count changed":
//
// conversationUnreadIncremented: emitted by MessagingRealtimeProvider,
// exactly once per live message from someone other than the viewer,
// UNLESS that conversation is the one currently open (see
// isConversationActive below) — matching the same rule
// computeUnreadCounts() already applies server-side implicitly (a message
// you're actively viewing doesn't stay "unread" once read).
//
// conversationUnreadCleared: emitted by MessageThread the instant it
// mounts for a conversation (alongside its existing markConversationRead()
// call) — optimistic and immediate, not gated on that server call
// resolving, matching every other "my own action" pattern in this file.
//
// Deliberately two narrow events instead of a shared external store
// (e.g. useSyncExternalStore over a module-singleton Record): Sidebar and
// ConversationList each already hold their own per-conversation baseline
// (from their own initial server props) and apply these as simple, local
// +1 / =0 patches — the same pattern already proven in Phase 3/4, rather
// than a second, less-tested state-sharing mechanism. See the Phase 5
// implementation notes for why an external-store approach was considered
// and rejected here (SSR/hydration mismatch risk with no upside, since
// nothing genuinely needs to be shared beyond these two events).
export const conversationUnreadIncremented = createTopic<string>();
export const conversationUnreadCleared = createTopic<string>();

// "Active" = the conversation the current tab has open in MessageThread
// right now, not "was opened at some point." A plain module variable, not
// a topic — nothing needs to react to it changing on its own; it's only
// ever read synchronously, at the moment a messages INSERT is processed,
// to decide whether to emit conversationUnreadIncremented.
let activeConversationId: string | null = null;

export function setActiveConversationId(id: string | null) {
  activeConversationId = id;
}

export function isConversationActive(id: string): boolean {
  return activeConversationId === id;
}
