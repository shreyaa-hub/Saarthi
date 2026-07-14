"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Thin wrapper around the create_notification RPC — swallows failures by
// design (a failed notification shouldn't ever block the real action that
// triggered it, e.g. assigning an activity still succeeds even if the
// "hey, you got a new assignment" ping fails to send).
export async function notify(
  supabase: SupabaseClient<Database>,
  recipientId: string,
  type: string,
  title: string,
  body: string | null,
  link: string | null,
) {
  const { error } = await supabase.rpc("create_notification", {
    p_recipient_id: recipientId,
    p_type: type,
    p_title: title,
    p_body: body,
    p_link: link,
  });
  if (error) console.error("[notify] create_notification failed:", error.message);
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/clinician");
  revalidatePath("/patient");
  return { error: error?.message ?? null };
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  revalidatePath("/clinician");
  revalidatePath("/patient");
  return { error: error?.message ?? null };
}
