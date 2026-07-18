"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMessages, type MessageCursor, type MessagePage } from "@/lib/data/messages";
import type { Database, ProfileRole } from "@/lib/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];

// Single source of truth for where a "new message" notification should
// point, shared by notifyRecipients() (the recipient's own link, written
// at notify time) and markConversationRead() (the reader's own link,
// recomputed to find the matching notification to clear) — kept in one
// place so the two can't silently drift apart into different formats.
function messageNotificationLink(viewerRole: ProfileRole, clinicianPatientId: string): string {
  return viewerRole === "clinician"
    ? `/clinician/messages/${clinicianPatientId}`
    : `/patient/messages?with=${clinicianPatientId}`;
}

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

// Notifies every other participant of a new message via notify_new_message()
// (Step 4) — while unread, a later message on the same conversation
// coalesces into the same notification instead of stacking a new one; see
// that RPC's definition in the migration for the full dedup reasoning.
// Requires the conversation's clinician_patient_id to build each
// recipient's link (clinician and patient recipients get different route
// shapes); a conversation with none (none exist yet — every conversation
// today is created via start_conversation(), which always sets it) has
// nothing valid to link to, so that recipient is skipped rather than
// notified with a broken link.
async function notifyRecipients(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  senderId: string,
  preview: string,
) {
  const [{ data: conversation }, { data: recipients, error: recipientsError }, { data: sender }] = await Promise.all([
    supabase.from("conversations").select("clinician_patient_id").eq("id", conversationId).maybeSingle(),
    supabase
      .from("conversation_participants")
      .select("user_id, profiles(role)")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId),
    // Sender's own profile — RLS-permitted trivially (profiles_select_own,
    // this is the caller's own row via auth.uid() = senderId). Needed so
    // the notification title identifies who sent it (previously a static
    // "New message" for every recipient, regardless of sender — with only
    // one recipient per 1:1 conversation, no per-recipient personalization
    // beyond the name itself is needed).
    supabase.from("profiles").select("full_name").eq("id", senderId).maybeSingle(),
  ]);

  if (recipientsError) {
    console.error("[actions/messages] notifyRecipients: lookup failed:", recipientsError.message, recipientsError.details);
    return;
  }

  const clinicianPatientId = conversation?.clinician_patient_id;
  if (!clinicianPatientId) return;

  const title = `New message from ${sender?.full_name ?? "someone"}`;

  await Promise.all(
    (recipients ?? []).map(async (r) => {
      if (!r.profiles) return;
      const link = messageNotificationLink(r.profiles.role, clinicianPatientId);
      const { error } = await supabase.rpc("notify_new_message", {
        p_recipient_id: r.user_id,
        p_reference_id: conversationId,
        p_link: link,
        p_title: title,
        p_body: preview,
      });
      if (error) {
        console.error("[actions/messages] notifyRecipients: notify_new_message failed:", error.message);
      }
    }),
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
//
// Also clears the caller's own unread "new message" notification for this
// conversation, if any — otherwise the bell would show it as unread
// forever for anyone who opens a thread directly (sidebar, inbox) instead
// of clicking through the notification itself. This is an RLS-scoped
// update on the caller's own row (notifications_owner_update), not a
// third party reaching into someone else's notifications, so it needs no
// RPC — unlike creating/coalescing one, which does (see
// notify_new_message()). Matches by reference_id = conversationId, the
// same value notify_new_message() stored it under, so a patient with
// multiple active clinicians only ever clears the one conversation they
// actually opened.
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

  if (error) return { error: error.message };

  const { error: notificationError } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("type", "new_message")
    .eq("reference_id", conversationId)
    .is("read_at", null);

  if (notificationError) {
    console.error(
      "[actions/messages] markConversationRead: clearing notification failed:",
      notificationError.message,
    );
  }

  revalidateMessagingRoutes();
  return { error: null };
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
