import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/notifications] ${context}:`, error.message, error.details);
}

export async function getMyNotifications(supabase: Client, userId: string, limit = 20) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  logIfError("getMyNotifications", error);
  return data ?? [];
}

export async function getUnreadNotificationCount(supabase: Client, userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  logIfError("getUnreadNotificationCount", error);
  return count ?? 0;
}
