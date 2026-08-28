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
  clinicianPatientId: string | null;
  // Set instead of clinicianPatientId on a guardian thread — the parent's own
  // conversation with their child's clinician, which is deliberately separate
  // from the child's (see start_parent_conversation).
  parentChildId: string | null;
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
      .select("id, clinician_patient_id, parent_child_id, last_message_at, last_message_preview")
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
    clinicianPatientId: conversation.clinician_patient_id,
    parentChildId: conversation.parent_child_id,
    lastMessageAt: conversation.last_message_at,
    lastMessagePreview: conversation.last_message_preview,
    unreadCount: unreadCounts[conversation.id] ?? 0,
    otherParticipants: othersByConversation.get(conversation.id) ?? [],
  }));
}

// The URL segment that opens this row's thread, under
// /clinician/messages/[threadKey]. A patient thread is keyed by its caseload
// row, as it always has been. A guardian thread has no caseload row of its
// own, so it is keyed by the parent_children link behind this prefix.
// Prefixed rather than a second route segment so one route still opens
// either, and underscores rather than a colon because Next percent-encodes a
// colon in a dynamic segment and the value comes back unusable.
export const GUARDIAN_THREAD_PREFIX = "guardian__";

export function guardianThreadKey(parentChildId: string): string {
  return `${GUARDIAN_THREAD_PREFIX}${parentChildId}`;
}

export function parseGuardianThreadKey(threadKey: string): string | null {
  return threadKey.startsWith(GUARDIAN_THREAD_PREFIX)
    ? threadKey.slice(GUARDIAN_THREAD_PREFIX.length)
    : null;
}

export type InboxRow = {
  /** "patient" is the child's own thread; "guardian" is their parent's. */
  kind: "patient" | "guardian";
  threadKey: string;
  clinicianPatientId: string;
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  /** Whose thread this is, when that isn't the patient — the guardian's name. */
  counterpartName: string;
  conversationId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  /** null for no messages yet, or for a SYSTEM message (sender_id is null by design). */
  lastMessageSenderId: string | null;
  unreadCount: number;
};

// The clinician inbox's primary data source: every active patient, not
// just ones with an existing conversation — selecting a patient with none
// yet is expected to transparently create one via start_conversation().
// Existing conversations carry their real activity; patients with no
// conversation yet get null activity fields and sort after all of them.
//
// Guardian threads are listed alongside them. They used to be dropped
// entirely: this list was built purely from caseload rows and matched
// conversations by clinician_patient_id, which is null on every guardian
// thread. A parent could write to their child's clinician from
// /parent/messages and the message reached no inbox, no route and no
// notification — it simply went nowhere.
export async function getClinicianInbox(supabase: Client, clinicianId: string): Promise<InboxRow[]> {
  const [{ data: activePatients, error: patientsError }, conversations] = await Promise.all([
    supabase
      .from("clinician_patients")
      .select("id, patient_id, display_name, profiles!clinician_patients_patient_id_fkey(full_name, email)")
      .eq("clinician_id", clinicianId)
      .eq("status", "active")
      .not("patient_id", "is", null)
      .order("created_at", { ascending: false }),
    getMyConversations(supabase, clinicianId),
  ]);

  logIfError("getClinicianInbox:activePatients", patientsError);

  const conversationByClinicianPatientId = new Map(
    conversations
      .filter((c): c is typeof c & { clinicianPatientId: string } => c.clinicianPatientId !== null)
      .map((c) => [c.clinicianPatientId, c]),
  );

  // Which caseload row and which child each guardian thread belongs to, so a
  // guardian row can be labelled with both names ("Priya · Aanya's guardian")
  // and sit next to the child's own thread.
  const guardianConversations = conversations.filter(
    (c): c is typeof c & { parentChildId: string } => c.parentChildId !== null,
  );
  const guardianLinks = new Map<string, { clinicianPatientId: string; childId: string }>();
  if (guardianConversations.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from("parent_children")
      .select("id, child_id, clinician_patient_id")
      .in("id", guardianConversations.map((c) => c.parentChildId));

    logIfError("getClinicianInbox:guardianLinks", linksError);
    for (const l of links ?? []) {
      if (!l.clinician_patient_id) continue;
      guardianLinks.set(l.id, { clinicianPatientId: l.clinician_patient_id, childId: l.child_id });
    }
  }

  // Who sent the most recent message per conversation, for the "You:" /
  // "Patient:" preview prefix. Not folded into getMyConversations() itself
  // (which stays general-purpose) since only this inbox preview needs it.
  const conversationIds = conversations.map((c) => c.id);
  const lastSenderByConversation = new Map<string, string | null>();
  if (conversationIds.length > 0) {
    const { data: recentMessages, error: recentError } = await supabase
      .from("messages")
      .select("conversation_id, sender_id, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    logIfError("getClinicianInbox:recentMessages", recentError);
    for (const m of recentMessages ?? []) {
      if (!lastSenderByConversation.has(m.conversation_id)) {
        lastSenderByConversation.set(m.conversation_id, m.sender_id);
      }
    }
  }

  const patientRows: InboxRow[] = (activePatients ?? []).map((p) => {
    const conversation = conversationByClinicianPatientId.get(p.id);
    const patientName = p.profiles?.full_name ?? p.display_name;
    return {
      kind: "patient",
      threadKey: p.id,
      clinicianPatientId: p.id,
      patientId: p.patient_id as string,
      patientName,
      patientEmail: p.profiles?.email ?? null,
      counterpartName: patientName,
      conversationId: conversation?.id ?? null,
      lastMessageAt: conversation?.lastMessageAt ?? null,
      lastMessagePreview: conversation?.lastMessagePreview ?? null,
      lastMessageSenderId: conversation ? (lastSenderByConversation.get(conversation.id) ?? null) : null,
      unreadCount: conversation?.unreadCount ?? 0,
    };
  });

  const patientRowByClinicianPatientId = new Map(patientRows.map((r) => [r.clinicianPatientId, r]));

  const guardianRows: InboxRow[] = [];
  for (const conversation of guardianConversations) {
    const link = guardianLinks.get(conversation.parentChildId);
    // A guardian link whose caseload row is gone (the child was discharged)
    // has no patient to file the thread under, so it is left out rather than
    // shown against a patient this clinician may no longer see.
    if (!link) continue;
    const patientRow = patientRowByClinicianPatientId.get(link.clinicianPatientId);
    if (!patientRow) continue;

    const guardian = conversation.otherParticipants.find((p) => p.role === "parent");
    guardianRows.push({
      kind: "guardian",
      threadKey: guardianThreadKey(conversation.parentChildId),
      clinicianPatientId: link.clinicianPatientId,
      patientId: patientRow.patientId,
      patientName: patientRow.patientName,
      patientEmail: null,
      counterpartName: guardian?.fullName ?? "Guardian",
      conversationId: conversation.id,
      lastMessageAt: conversation.lastMessageAt,
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageSenderId: lastSenderByConversation.get(conversation.id) ?? null,
      unreadCount: conversation.unreadCount,
    });
  }

  return [...patientRows, ...guardianRows].sort(compareInboxRows);
}

// Existing conversations first ordered by most recent activity, then
// patients with no conversation yet (already ordered most-recently-added
// first by the query above — returning 0 preserves that relative order,
// since Array#sort is stable). Never reordered by unread status.
//
// Exported so ConversationList can apply this exact same ordering when
// live-patching a row's lastMessageAt from a Realtime event, instead of a
// second, independently-maintained comparator that could silently drift
// from this one.
export function compareInboxRows(a: InboxRow, b: InboxRow): number {
  if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt);
  if (a.lastMessageAt) return -1;
  if (b.lastMessageAt) return 1;
  return 0;
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
