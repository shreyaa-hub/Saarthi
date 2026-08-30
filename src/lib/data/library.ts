import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { TemplateMedium } from "@/lib/types/canvas";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/library] ${context}:`, error.message, error.details);
}

// One published item in full, including its canvas, for the preview.
// Deliberately separate from getPublicTemplates: the grid lists dozens of
// cards and has no use for their canvases, so they are fetched only when
// somebody actually opens a preview.
export async function getPublicTemplateDetail(supabase: Client, templateId: string) {
  const { data, error } = await supabase
    .from("templates")
    .select("id, title, description, domain, medium, canvas, updated_at")
    .eq("id", templateId)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  logIfError("getPublicTemplateDetail", error);
  return data;
}

export async function getPublicTemplates(
  supabase: Client,
  opts: { medium?: TemplateMedium; query?: string } = {},
) {
  let q = supabase
    .from("templates")
    .select("id, title, domain, medium, thumbnail_color, thumbnail_url, updated_at")
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
