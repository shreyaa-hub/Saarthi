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
import type { MessageCursor } from "@/lib/data/messages";
import { cn, formatRelativeTime, initials } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const PAGE_SIZE = 30;

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
  const [cursor, setCursor] = useState(initialCursor);
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

  // Mark the thread read as soon as the clinician opens it. Fire-and-forget,
  // same swallow-failures posture as notify() elsewhere in this app — a
  // failed read receipt shouldn't block or error the thread view.
  useEffect(() => {
    markConversationRead(conversationId).catch(() => {});
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
      setMessages((prev) => [...prev, message]);
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
      const editedAt = new Date().toISOString();
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
