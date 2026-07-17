"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/actions/notifications";
import { getMessages, type MessageCursor, type MessagePage } from "@/lib/data/messages";
import type { Database } from "@/lib/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];

// IMPORTANT: this is a server-side cache invalidation, not a live push.
// revalidatePath() only marks /clinician and /patient's cached renders
// stale on the server — it does nothing to any already-open browser tab.
// What it actually buys: the *next* fresh navigation into either shell (by
// either party, in either party's own session) re-fetches real data
// instead of a stale cached render, so the sidebar unread badge and the
// clinician inbox list are correct once someone actually navigates there.
// It does NOT make a counterpart's already-open tab update on its own —
// an open clinician tab will not show a patient's new message or read
// receipt appearing live. That's what Step 5 (Realtime) is for; nothing
// here provides it.
function revalidateMessagingRoutes() {
  revalidatePath("/clinician", "layout");
  revalidatePath("/patient", "layout");
}

// Client Components have no server-side Supabase client of their own, so
// "load older messages" needs a callable server entry point. This is a pure
// pass-through to Phase 1's getMessages() — no pagination or authorization
// logic is duplicated here.
export async function loadOlderMessages(
  conversationId: string,
  before: MessageCursor,
  limit?: number,
): Promise<MessagePage> {
  const supabase = await createClient();
  return getMessages(supabase, conversationId, { before, limit });
}

// Notifies every other participant of a new message via the existing
// notify() helper, exactly as every other feature in this app already
// notifies — one notification per message, no deduplication.
//
// KNOWN LIMITATION (Phase 1): this can spam a participant with one
// notification per message during a fast back-and-forth. A real fix needs
// either a dedicated notification-aggregation RPC (notifications' RLS is
// owner-only for both select and update, so a sender's session can't read
// or coalesce another user's existing notification row without one — see
// the Phase 1 architecture discussion) or a presence/"actively viewing"
// signal from Realtime. Both are explicitly deferred to when Realtime and
// presence are implemented, per direction from that discussion.
async function notifyRecipients(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  senderId: string,
  preview: string,
) {
  const { data: recipients, error } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", senderId);

  if (error) {
    console.error("[actions/messages] notifyRecipients: lookup failed:", error.message, error.details);
    return;
  }

  // link is left null: no messaging routes exist yet in this phase (backend
  // stays UI-independent), so there's nothing real to point at. Wiring a
  // real thread link is a Phase 2 dependency.
  await Promise.all(
    (recipients ?? []).map((r) => notify(supabase, r.user_id, "new_message", "New message", preview, null)),
  );
}

// Get-or-create the conversation for a clinician_patients relationship.
// Thin wrapper around the Phase 0 start_conversation() RPC, which does all
// authorization (active + claimed relationship; caller is one of its two
// parties) — nothing here duplicates that check.
export async function startConversation(
  clinicianPatientId: string,
): Promise<{ error: string | null; conversation?: ConversationRow }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    p_clinician_patient_id: clinicianPatientId,
  });

  if (error) return { error: error.message };
  return { error: null, conversation: data ?? undefined };
}

// Sends a TEXT message and notifies the other participant(s). Authorization
// (sender must be a participant; can't impersonate another sender; can't
// insert SYSTEM directly) is entirely enforced by the messages_sender_insert
// RLS policy — a failed insert here means RLS rejected it, surfaced as a
// plain error rather than a silent no-op (Postgres raises on a failed
// INSERT check, unlike UPDATE/SELECT which just filter rows).
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ error: string | null; message?: MessageRow }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Message can't be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: "TEXT",
      body: trimmed,
    })
    .select()
    .single();

  if (error || !message) {
    return { error: error?.message ?? "Could not send message. You may not be part of this conversation." };
  }

  await notifyRecipients(supabase, conversationId, user.id, trimmed);
  revalidateMessagingRoutes();

  return { error: null, message };
}

// Advances the caller's own read position in a conversation. Filtered to
// user_id = the caller both here and by the conversation_participants_
// self_update RLS policy — belt-and-suspenders on the same condition, not
// duplicated authorization logic (RLS is still what actually enforces it).
export async function markConversationRead(conversationId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (!error) revalidateMessagingRoutes();
  return { error: error?.message ?? null };
}

// Edits a message's body. Only the sender may edit, and never a SYSTEM
// message — enforced by messages_sender_update. Because a blocked UPDATE
// under RLS returns zero affected rows rather than an error, a missing
// returned row after the update is treated as "not found or not permitted"
// so callers get a predictable error instead of a silent no-op.
export async function editMessage(messageId: string, body: string): Promise<{ error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Message can't be empty." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Message not found, or you don't have permission to edit it." };

  revalidateMessagingRoutes();
  return { error: null };
}

// Soft-deletes a message (sets deleted_at) rather than removing the row, so
// the conversation's history stays intact for the other participant. Same
// RLS-backed "not found or not permitted" handling as editMessage.
export async function deleteMessage(messageId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Message not found, or you don't have permission to delete it." };

  revalidateMessagingRoutes();
  return { error: null };
}
