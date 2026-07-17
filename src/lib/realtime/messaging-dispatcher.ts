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
