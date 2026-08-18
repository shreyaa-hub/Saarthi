import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/blueprint-rules] ${context}:`, error.message, error.details);
}

export type BlueprintRule = {
  id: string;
  body: string;
  isDefault: boolean;
  createdAt: string;
  authorName: string | null;
};

type RuleRow = {
  id: string;
  body: string;
  is_default: boolean;
  created_at: string;
  profiles: { full_name: string } | null;
};

// Platform defaults first, then the rest oldest-first, so the baseline
// standards always read as the foundation rather than being interleaved with
// whatever a colleague added this morning.
export async function getBlueprintRules(supabase: Client): Promise<BlueprintRule[]> {
  const { data, error } = await supabase
    .from("blueprint_rules")
    .select("id, body, is_default, created_at, profiles!blueprint_rules_created_by_fkey(full_name)")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  logIfError("getBlueprintRules", error);

  return ((data ?? []) as unknown as RuleRow[]).map((row) => ({
    id: row.id,
    body: row.body,
    isDefault: row.is_default,
    createdAt: row.created_at,
    authorName: row.profiles?.full_name ?? null,
  }));
}
