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

export type BlueprintRulesResult = {
  rules: BlueprintRule[];
  // True when the read itself failed — most often because the migration has
  // not been applied yet. Reported separately from an empty list, because
  // "there are no rules" and "we could not find out" are different answers
  // and only one of them is the clinician's problem to fix.
  failed: boolean;
};

// Platform defaults first, then the rest oldest-first, so the baseline
// standards always read as the foundation rather than being interleaved with
// whatever a colleague added this morning.
export async function getBlueprintRules(supabase: Client): Promise<BlueprintRulesResult> {
  const { data, error } = await supabase
    .from("blueprint_rules")
    .select("id, body, is_default, created_at, profiles!blueprint_rules_created_by_fkey(full_name)")
    .order("is_default", { ascending: false })
    // sort_order carries the baseline rules' intended grouping; it is 0 for
    // anything a clinician wrote, which then falls back to oldest-first.
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  logIfError("getBlueprintRules", error);

  return {
    failed: Boolean(error),
    rules: ((data ?? []) as unknown as RuleRow[]).map((row) => ({
      id: row.id,
      body: row.body,
      isDefault: row.is_default,
      createdAt: row.created_at,
      authorName: row.profiles?.full_name ?? null,
    })),
  };
}
