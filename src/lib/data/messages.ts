import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;
type ConversationParticipantRow = Database["public"]["Tables"]["conversation_participants"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/messages] ${context}:`, error.message, error.details);
}

// Messages sent before a participant ever read their conversation are all
// unread — this sentinel lets "never read" compare like any other cutoff
// instead of needing a null-check at every call site.
const NEVER_READ = "1970-01-01T00:00:00.000Z";

// Counts unread messages per conversation for one user in a single query,
// regardless of how many conversations they're in: fetch every relevant
// last_read_at once, then fetch every message newer than the earliest of
// those cutoffs, and bucket the rest in memory. Avoids one query per
// conversation (N+1).
async function computeUnreadCounts(
  supabase: Client,
  userId: string,
  memberships: Pick<ConversationParticipantRow, "conversation_id" | "last_read_at">[],
): Promise<Record<string, number>> {
  if (memberships.length === 0) return {};

  const earliestCutoff = memberships.reduce((min, m) => {
    const cutoff = m.last_read_at ?? NEVER_READ;
    return cutoff < min ? cutoff : min;
  }, memberships[0].last_read_at ?? NEVER_READ);

  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in(
      "conversation_id",
      memberships.map((m) => m.conversation_id),
    )
    .is("deleted_at", null)
    .gt("created_at", earliestCutoff);

  logIfError("computeUnreadCounts", error);

  const cutoffByConversation = new Map(
    memberships.map((m) => [m.conversation_id, m.last_read_at ?? NEVER_READ]),
  );
  const counts: Record<string, number> = {};

  for (const message of data ?? []) {
    if (message.sender_id === userId) continue;
    const cutoff = cutoffByConversation.get(message.conversation_id);
    if (cutoff !== undefined && message.created_at <= cutoff) continue;
    counts[message.conversation_id] = (counts[message.conversation_id] ?? 0) + 1;
  }
  return counts;
}

// Standalone unread-count lookup (e.g. for a future Alert Hub badge). Kept
// separate from getMyConversations so callers that only need counts don't
// pay for the participant/profile joins that function also does.
export async function getUnreadCounts(supabase: Client, userId: string): Promise<Record<string, number>> {
  const { data: memberships, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  logIfError("getUnreadCounts", error);
  return computeUnreadCounts(supabase, userId, memberships ?? []);
}

export type ConversationSummary = {
  id: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  otherParticipants: { userId: string; fullName: string; role: string }[];
};

// Inbox listing: every conversation the user is in, newest activity first,
// with who else is in it and how many unread messages are waiting. Fixed
// number of queries regardless of conversation count (no N+1).
export async function getMyConversations(supabase: Client, userId: string): Promise<ConversationSummary[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  logIfError("getMyConversations:memberships", membershipsError);
  const conversationIds = (memberships ?? []).map((m) => m.conversation_id);
  if (conversationIds.length === 0) return [];

  const [conversationsRes, othersRes, unreadCounts] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, last_message_at, last_message_preview")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false }),
    supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, profiles(full_name, role)")
      .in("conversation_id", conversationIds)
      .neq("user_id", userId),
    computeUnreadCounts(supabase, userId, memberships ?? []),
  ]);

  logIfError("getMyConversations:conversations", conversationsRes.error);
  logIfError("getMyConversations:others", othersRes.error);

  const othersByConversation = new Map<string, ConversationSummary["otherParticipants"]>();
  for (const row of othersRes.data ?? []) {
    if (!row.profiles) continue;
    const list = othersByConversation.get(row.conversation_id) ?? [];
    list.push({ userId: row.user_id, fullName: row.profiles.full_name, role: row.profiles.role });
    othersByConversation.set(row.conversation_id, list);
  }

  return (conversationsRes.data ?? []).map((conversation) => ({
    id: conversation.id,
    lastMessageAt: conversation.last_message_at,
    lastMessagePreview: conversation.last_message_preview,
    unreadCount: unreadCounts[conversation.id] ?? 0,
    otherParticipants: othersByConversation.get(conversation.id) ?? [],
  }));
}

export type ConversationDetail = Database["public"]["Tables"]["conversations"]["Row"] & {
  participants: { userId: string; fullName: string; role: string; lastReadAt: string | null }[];
};

// A single conversation plus its participant roster. Returns null both when
// the conversation doesn't exist and when the caller isn't a participant —
// RLS (conversations_participant_select) makes those indistinguishable on
// purpose, so this function never needs its own authorization check.
export async function getConversation(
  supabase: Client,
  conversationId: string,
): Promise<ConversationDetail | null> {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  logIfError("getConversation:conversation", conversationError);
  if (!conversation) return null;

  const { data: participants, error: participantsError } = await supabase
    .from("conversation_participants")
    .select("user_id, last_read_at, profiles(full_name, role)")
    .eq("conversation_id", conversationId);

  logIfError("getConversation:participants", participantsError);

  return {
    ...conversation,
    participants: (participants ?? [])
      .filter((p) => p.profiles)
      .map((p) => ({
        userId: p.user_id,
        fullName: p.profiles!.full_name,
        role: p.profiles!.role,
        lastReadAt: p.last_read_at,
      })),
  };
}

// created_at alone isn't a unique ordering key — two messages can share a
// timestamp (down to the same microsecond, e.g. under load or a burst
// insert). Pairing it with id (unique, and stable within an equal-
// timestamp group) makes the ordering — and therefore the cursor — fully
// deterministic, so a page boundary landing mid-timestamp can't skip or
// repeat a row.
export type MessageCursor = { createdAt: string; id: string };

export type MessagePage = {
  messages: MessageRow[];
  /** Pass as `before` to fetch the next (older) page; null when there's no more. */
  nextCursor: MessageCursor | null;
};

// Cursor-paginated message history for a conversation, oldest-to-newest
// within the returned page (ready to render top-to-bottom). The cursor
// identifies the oldest message in a page — pass it back as `before` to
// walk further into the past. Includes soft-deleted rows; whether to show a
// "message deleted" placeholder for them is a rendering decision for a
// later phase, not this one.
export async function getMessages(
  supabase: Client,
  conversationId: string,
  opts: { before?: MessageCursor; limit?: number } = {},
): Promise<MessagePage> {
  const limit = opts.limit ?? 30;

  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (opts.before) {
    // Strictly older than the cursor under (created_at desc, id desc):
    // either an earlier timestamp, or the same timestamp with a smaller id.
    query = query.or(
      `created_at.lt.${opts.before.createdAt},and(created_at.eq.${opts.before.createdAt},id.lt.${opts.before.id})`,
    );
  }

  const { data, error } = await query;
  logIfError("getMessages", error);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  page.reverse();

  return {
    messages: page,
    nextCursor: hasMore ? { createdAt: page[0].created_at, id: page[0].id } : null,
  };
}
