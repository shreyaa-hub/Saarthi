import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { TemplateMedium } from "@/lib/types/canvas";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/library] ${context}:`, error.message, error.details);
}

export async function getPublicTemplates(
  supabase: Client,
  opts: { medium?: TemplateMedium; query?: string } = {},
) {
  let q = supabase
    .from("templates")
    .select("id, title, domain, medium, thumbnail_color, updated_at")
    .eq("is_public", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (opts.medium) q = q.eq("medium", opts.medium);
  if (opts.query) q = q.ilike("title", `%${opts.query}%`);

  const { data, error } = await q;
  logIfError("getPublicTemplates", error);
  return data ?? [];
}

export async function getPublicAssets(supabase: Client, opts: { query?: string } = {}) {
  let q = supabase.from("assets").select("*").order("created_at", { ascending: false });
  if (opts.query) q = q.ilike("alt", `%${opts.query}%`);

  const { data, error } = await q;
  logIfError("getPublicAssets", error);
  return data ?? [];
}
