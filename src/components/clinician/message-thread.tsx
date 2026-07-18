"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Send, Pencil, Trash2, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
  loadOlderMessages,
} from "@/lib/actions/messages";
import {
  messagesInserted,
  messagesUpdated,
  conversationUnreadCleared,
  setActiveConversationId,
} from "@/lib/realtime/messaging-dispatcher";
import { useConversationVisible } from "@/lib/realtime/conversation-visibility-context";
import type { MessageCursor } from "@/lib/data/messages";
import { cn, formatRelativeTime, initials } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const PAGE_SIZE = 30;

// Canonical ascending order, matching getMessages() exactly: the server
// fetches (created_at desc, id desc) for pagination and .reverse()s the
// page before returning it, so the true ascending tie-break is
// (created_at asc, id asc) — same as here. String comparison of the id
// column is safe specifically because Supabase always returns uuid
// columns as canonically-formatted lowercase hyphenated text: every
// value has hyphens at identical positions, so comparing the strings
// character-by-character agrees with Postgres's own uuid ordering (the
// same property the composite pagination cursor already relies on when
// it sends `id.lt.${cursor.id}` back to Postgres).
function compareMessages(a: MessageRow, b: MessageRow): number {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

// Single reconciliation path for "a message belongs in this array" — used
// by BOTH handleSend's direct sendMessage() response and the Realtime
// INSERT handler below, specifically so the two can never drift into two
// different dedup/ordering implementations (that gap is exactly what
// caused the duplicate-outgoing-message bug: handleSend used to append
// unconditionally, with no id check, while only the Realtime path had
// one — whichever of the two arrived second had no way of knowing the
// other had already added the row). Idempotent regardless of call order.
function insertMessage(prev: MessageRow[], row: MessageRow): MessageRow[] {
  if (prev.some((m) => m.id === row.id)) return prev;
  return [...prev, row].sort(compareMessages);
}

// Reconnect reconciliation, other half. insertMessage() above is
// deliberately insert-only (no-ops on an id already present), which is
// correct for Realtime events arriving one at a time on a live socket but
// wrong here: a fresh `initialMessages` batch (from a reconnect-triggered
// router.refresh(), see messaging-provider.tsx) is the server's authoritative
// state as of right now, so a row it contains must OVERWRITE any stale local
// copy of that same id — otherwise an edit/delete that happened to a message
// during the disconnect gap would silently never surface, even though the
// gap-recovery mechanism ran. Starts from `current` rather than `fresh` so
// older paginated-in messages (outside the fresh batch's window, loaded via
// loadOlderMessages) are preserved rather than dropped.
//
// `protectedIds` exists because "fresh always wins" is only true when fresh
// is actually newer than current — which isn't guaranteed. router.refresh()
// fires a brand new getMessages() request with no ordering guarantee
// relative to an in-flight handleSaveEdit/handleDelete Server Action: if
// that fetch's snapshot is taken before the edit/delete's own UPDATE
// commits, `fresh` carries the pre-edit row, and blindly overwriting current
// would revert an edit/delete the user just confirmed as successful. Ids in
// `protectedIds` are skipped so current's (more recent) optimistic copy
// survives; see pendingLocalMutations in MessageThread for how that set is
// populated and cleared.
function mergeMessages(
  current: MessageRow[],
  fresh: MessageRow[],
  protectedIds: ReadonlySet<string>,
): MessageRow[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const row of fresh) {
    if (protectedIds.has(row.id)) continue;
    byId.set(row.id, row);
  }
  return Array.from(byId.values()).sort(compareMessages);
}

// How long a local edit/delete stays protected from being overwritten by a
// stale refresh if its own messagesUpdated confirmation never arrives (e.g.
// that specific UPDATE broadcast was itself among the events lost in the
// same disconnect gap the refresh is trying to recover from). Comfortably
// longer than the reconnect debounce (2s) and any realistic Server Action
// round trip; short enough that a genuinely stuck entry doesn't diverge
// from the server forever.
const PENDING_MUTATION_TTL_MS = 30_000;

// Pure — deliberately does not mutate `pending`. This is read from
// MessageThread's render body (the "adjust state during render" block
// below), and React's rules forbid reading *or* writing a ref during
// render; pendingLocalMutations is therefore plain useState, not a ref, and
// this function must stay side-effect-free to be safely called from there.
function activeProtectedIds(pending: ReadonlyMap<string, number>): Set<string> {
  const now = Date.now();
  const ids = new Set<string>();
  for (const [id, startedAt] of pending) {
    if (now - startedAt < PENDING_MUTATION_TTL_MS) ids.add(id);
  }
  return ids;
}

// Records a new pending mutation and, in the same pass, drops any entries
// that have already expired — bounds the map's size over a long session
// without needing a separate timer, since this runs every time a new
// edit/delete is made.
function markPendingMutation(pending: ReadonlyMap<string, number>, id: string): Map<string, number> {
  const now = Date.now();
  const next = new Map<string, number>();
  for (const [existingId, startedAt] of pending) {
    if (now - startedAt < PENDING_MUTATION_TTL_MS) next.set(existingId, startedAt);
  }
  next.set(id, now);
  return next;
}

export function MessageThread({
  conversationId,
  currentUserId,
  otherParticipantName,
  initialMessages,
  initialCursor,
}: {
  conversationId: string;
  currentUserId: string;
  otherParticipantName: string;
  initialMessages: MessageRow[];
  initialCursor: MessageCursor | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages);
  const [cursor, setCursor] = useState(initialCursor);

  // Ids (and when-marked timestamps) with a local optimistic edit/delete
  // not yet confirmed by the authoritative messagesUpdated echo —
  // populated in handleSaveEdit/handleDelete, cleared in the
  // messagesUpdated subscriber below. Plain useState rather than a ref:
  // the render-time merge below needs to read it, and React's rules
  // forbid reading a ref during render (only state is safe there).
  const [pendingLocalMutations, setPendingLocalMutations] = useState<Map<string, number>>(new Map());

  // Adjust state during render (React's documented alternative to a
  // useEffect-based prop mirror — same pattern already used by
  // ConversationList/NotificationBell/both Sidebars). Reference-equality
  // guard means this only fires when the parent Server Component actually
  // re-ran and produced a genuinely new `initialMessages` array, i.e. a
  // router.refresh() (or any other revalidatePath-triggered refresh) while
  // this exact MessageThread instance stays mounted — the reconnect
  // reconciliation case. Merges rather than replaces so in-flight local
  // state (a message sent via handleSend a moment ago, not yet reflected in
  // this fresh batch) isn't discarded — see mergeMessages's own comment.
  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages);
    const protectedIds = activeProtectedIds(pendingLocalMutations);
    setMessages((prev) => mergeMessages(prev, initialMessages, protectedIds));
  }
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [, startTransition] = useTransition();
  const [composerValue, setComposerValue] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const pendingScrollAdjustRef = useRef<number | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const hasScrolledInitially = useRef(false);

  // Automatic scroll to the newest message, once, on initial load.
  useEffect(() => {
    if (hasScrolledInitially.current) return;
    hasScrolledInitially.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Whether this MessageThread instance is actually visible right now, not
  // just mounted — defaults to true everywhere except inside
  // MessagesSplitPane's mobile-hidden subtree (see
  // conversation-visibility-context.tsx). Found during the Step 5 final
  // audit: MessagesSplitPane keeps the clinician inbox's auto-selected
  // conversation mounted at all times, only CSS-hiding it on mobile — a
  // mounted-but-hidden thread was being treated as "the user is reading
  // this," both marking it read server-side and suppressing its unread
  // badge, for a conversation the user had never actually looked at.
  const isVisible = useConversationVisible();

  // Mark the thread read as soon as the clinician opens it — but only if
  // it's actually visible (see isVisible above). Fire-and-forget, same
  // swallow-failures posture as notify() elsewhere in this app — a failed
  // read receipt shouldn't block or error the thread view.
  //
  // Also (Step 5, Phase 5): marks this conversation "active" for as long
  // as it stays visible, and emits an immediate, optimistic
  // conversationUnreadCleared — both synchronous, client-side, not gated
  // on markConversationRead()'s server round-trip, matching "opening a
  // conversation marks it read immediately" from the Phase 5 acceptance
  // criteria. setActiveConversationId(null) whenever this effect cleans up
  // (unmount, conversationId change, OR isVisible flipping to false) is
  // what lets MessagingRealtimeProvider suppress
  // conversationUnreadIncremented for messages arriving while this thread
  // is genuinely on screen — see isConversationActive in
  // messaging-dispatcher.ts.
  useEffect(() => {
    if (!isVisible) return;
    setActiveConversationId(conversationId);
    conversationUnreadCleared.emit(conversationId);
    markConversationRead(conversationId).catch(() => {});
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, isVisible]);

  // Live updates (Step 5, Phase 2) — subscribes to the shared dispatcher
  // (see messaging-dispatcher.ts / MessagingRealtimeProvider), not its own
  // Realtime channel; the provider already owns the one messages channel
  // per tab. Each subscribe() call returns an unsubscribe function, wired
  // as this effect's cleanup, which removes the callback before this
  // component unmounts or conversationId changes — see the Phase 1 review
  // for why that's sufficient to prevent dispatch to a stale registration.
  //
  // The dispatcher's messages channel has no conversation_id filter (RLS
  // scopes delivery instead — see messaging-provider.tsx), so it emits
  // events for every conversation this user is in, not just this one;
  // every handler below filters to `conversationId` itself.
  useEffect(() => {
    const unsubscribeInsert = messagesInserted.subscribe((row) => {
      if (row.conversation_id !== conversationId) return;

      // Only auto-scroll if the viewport was already at (or very near)
      // the bottom right before this arrived — same rule the edit/delete
      // path already follows (see the effect below): never yank the view
      // for someone scrolled up reading history, extended here to a
      // genuinely new message from the other participant. Checked before
      // the state update, since scrollHeight won't reflect the new
      // message until after React re-renders.
      const el = scrollRef.current;
      const wasNearBottom = !!el && el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (wasNearBottom) shouldScrollToBottomRef.current = true;

      // Shared with handleSend's direct-response path — see insertMessage's
      // own comment for why using one function for both matters here.
      setMessages((prev) => insertMessage(prev, row));
    });

    const unsubscribeUpdate = messagesUpdated.subscribe((row) => {
      if (row.conversation_id !== conversationId) return;
      // payload.new is the complete post-update row, so replacing the
      // whole entry is both simpler and more correct than patching
      // individual fields — this also incidentally corrects
      // handleSaveEdit's client-fabricated edited_at guess below (a
      // pre-Step-5 limitation, not fixed by design, just naturally
      // overwritten once the server's real row arrives here).
      setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
      // This is the authoritative confirmation for any pending local edit/
      // delete on this id — safe to let a future refresh's merge trust
      // fresh data for it again. See pendingLocalMutations above.
      setPendingLocalMutations((prev) => {
        if (!prev.has(row.id)) return prev;
        const next = new Map(prev);
        next.delete(row.id);
        return next;
      });
    });

    return () => {
      unsubscribeInsert();
      unsubscribeUpdate();
    };
  }, [conversationId]);

  // Reacts to `messages` changing, which only runs after React has actually
  // committed the new DOM — unlike a scroll scheduled from inside the same
  // callback that calls setMessages(), which can read stale layout (this is
  // what caused the previous "always one message behind" bug: a
  // requestAnimationFrame scheduled right after setMessages() isn't
  // guaranteed to run after React's commit when the update originates in an
  // async callback). Two distinct scroll behaviours share this effect:
  //  - handleSend() sets shouldScrollToBottomRef before appending, so a
  //    message *I* just sent always scrolls into view.
  //  - handleLoadOlder() sets pendingScrollAdjustRef before prepending, so
  //    the viewport holds its visual position instead of jumping.
  // Edits and deletes update `messages` too, but set neither ref, so this
  // effect intentionally does nothing for them — otherwise editing an old
  // message while scrolled up would unexpectedly yank the view down.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = false;
      el.scrollTop = el.scrollHeight;
      return;
    }

    if (pendingScrollAdjustRef.current !== null) {
      el.scrollTop = el.scrollHeight - pendingScrollAdjustRef.current;
      pendingScrollAdjustRef.current = null;
    }
  }, [messages]);

  const handleLoadOlder = () => {
    if (!cursor || loadingOlder) return;
    const el = scrollRef.current;
    pendingScrollAdjustRef.current = el ? el.scrollHeight : null;
    setLoadingOlder(true);
    startTransition(async () => {
      const page = await loadOlderMessages(conversationId, cursor, PAGE_SIZE);
      setMessages((prev) => [...page.messages, ...prev]);
      setCursor(page.nextCursor);
      setLoadingOlder(false);
    });
  };

  const resetComposerHeight = () => {
    const el = composerRef.current;
    if (el) el.style.height = "";
  };

  const handleComposerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComposerValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSend = () => {
    const body = composerValue.trim();
    if (!body || sending) return;
    setComposerValue("");
    resetComposerHeight();
    setSending(true);
    startTransition(async () => {
      const { error, message } = await sendMessage(conversationId, body);
      setSending(false);
      if (error || !message) {
        toast.error(error ?? "Could not send message.");
        setComposerValue(body);
        return;
      }
      shouldScrollToBottomRef.current = true;
      // Was an unconditional append — the actual bug. If the Realtime
      // echo of this exact send had already arrived first (a real,
      // observed race, not hypothetical — see sendMessage()'s await
      // ordering discussed during the design review), this would append
      // a second, duplicate bubble instead of recognizing the row was
      // already there.
      setMessages((prev) => insertMessage(prev, message));
    });
  };

  const handleSaveEdit = (id: string) => {
    const body = editValue.trim();
    if (!body) return;
    setEditingId(null);
    startTransition(async () => {
      const { error } = await editMessage(id, body);
      if (error) {
        toast.error(error);
        return;
      }
      // Pre-Step-5 limitation, left as-is by design: editMessage() only
      // returns {error}, not the updated row, so edited_at here is this
      // browser's own clock, not the server's real value — briefly wrong
      // until the messagesUpdated dispatcher event (see the effect above)
      // replaces this whole row with the server's actual one.
      const editedAt = new Date().toISOString();
      // Marked pending BEFORE the optimistic setMessages so a reconnect
      // refresh's merge (which can run concurrently, see mergeMessages)
      // can't clobber this edit with a stale pre-edit snapshot.
      setPendingLocalMutations((prev) => markPendingMutation(prev, id));
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, body, edited_at: editedAt } : m)));
    });
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(null);
    startTransition(async () => {
      const { error } = await deleteMessage(id);
      if (error) {
        toast.error(error);
        return;
      }
      const deletedAt = new Date().toISOString();
      // Same reasoning as handleSaveEdit above — protects this delete from
      // being reverted by a stale concurrent refresh's merge.
      setPendingLocalMutations((prev) => markPendingMutation(prev, id));
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted_at: deletedAt } : m)));
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={`Conversation with ${otherParticipantName}`}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {/* min-h-full + justify-end anchors a short conversation to the
            bottom of the panel (matches every mainstream chat product —
            the newest message sits near the composer instead of floating
            at the top of mostly-empty space). Once content overflows,
            min-h-full stops constraining anything and normal top-to-bottom
            scroll takes over. */}
        <div className="flex min-h-full flex-col justify-end">
          {cursor && (
            <div className="flex justify-center pb-3">
              <Button variant="ghost" size="sm" onClick={handleLoadOlder} disabled={loadingOlder}>
                <ChevronUp className="size-3.5" /> {loadingOlder ? "Loading…" : "Load older messages"}
              </Button>
            </div>
          )}

          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No messages yet — say hello to {otherParticipantName}.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === currentUserId}
                  otherParticipantName={otherParticipantName}
                  isEditing={editingId === message.id}
                  editValue={editValue}
                  onStartEdit={() => {
                    setEditingId(message.id);
                    setEditValue(message.body ?? "");
                  }}
                  onChangeEdit={setEditValue}
                  onSaveEdit={() => handleSaveEdit(message.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onRequestDelete={() => setDeleteTargetId(message.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={composerRef}
            value={composerValue}
            onChange={handleComposerChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Message ${otherParticipantName}…`}
            aria-label={`Message ${otherParticipantName}`}
            rows={1}
            className="max-h-32 min-h-10 resize-none overflow-y-auto"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!composerValue.trim() || sending}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="pt-1.5 text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
      </div>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              {otherParticipantName} will see it as deleted. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  otherParticipantName,
  isEditing,
  editValue,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
  onRequestDelete,
}: {
  message: MessageRow;
  isOwn: boolean;
  otherParticipantName: string;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onChangeEdit: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRequestDelete: () => void;
}) {
  // message_type/sender_id only ever affect rendering here — never
  // authorization or any other behaviour. sender_id === null is how Phase 0
  // marks SYSTEM rows (only create_system_message() can produce that
  // combination), so this is the one place the UI needs to branch on it.
  if (message.sender_id === null) {
    return <p className="py-1 text-center text-xs text-muted-foreground">{message.body}</p>;
  }

  const isDeleted = message.deleted_at !== null;

  return (
    <div className={cn("group flex items-end gap-2", isOwn && "flex-row-reverse")}>
      {!isOwn && (
        <Avatar className="size-7">
          <AvatarFallback className="text-[10px]">{initials(otherParticipantName)}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex max-w-[75%] flex-col gap-1", isOwn && "items-end")}>
        {isEditing ? (
          <div className="flex w-64 max-w-full flex-col gap-2">
            <Textarea value={editValue} onChange={(e) => onChangeEdit(e.target.value)} rows={2} autoFocus />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              // min-w keeps a 1-3 character message ("hi", "ok") a
              // recognizable pill instead of rounded-2xl collapsing it into
              // a near-circle — confirmed visually against real short test
              // messages during this phase's review.
              "min-w-12 whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
              isOwn ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              isDeleted && "italic opacity-60",
            )}
          >
            {isDeleted ? "This message was deleted" : message.body}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <span>{formatRelativeTime(message.created_at)}</span>
          {message.edited_at && !isDeleted && <span>· edited</span>}
          {isOwn && !isDeleted && !isEditing && (
            // Visible on hover *and* keyboard focus (group-focus-within) —
            // opacity-0 tied only to group-hover would make these controls
            // permanently invisible to keyboard-only users, even though
            // they'd still be in the tab order.
            <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={onStartEdit}
                className="cursor-pointer rounded p-1.5 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Edit message"
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                onClick={onRequestDelete}
                className="cursor-pointer rounded p-1.5 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Delete message"
              >
                <Trash2 className="size-3" />
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
