"use server";

import { createClient } from "@/lib/supabase/server";

export type PaletteSearchResult = {
  templates: { id: string; title: string }[];
  patients: { id: string; name: string }[];
};

// Backs the clinician command palette's live search (Cmd/Ctrl+K). Kept as a
// single round-trip per keystroke (debounced client-side) rather than
// shipping the whole caseload/template list to the client up front.
export async function searchCommandPalette(query: string): Promise<PaletteSearchResult> {
  const q = query.trim();
  if (!q) return { templates: [], patients: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { templates: [], patients: [] };

  const [templatesRes, patientsRes] = await Promise.all([
    supabase
      .from("templates")
      .select("id, title")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .ilike("title", `%${q}%`)
      .limit(5),
    supabase
      .from("clinician_patients")
      .select("id, display_name, profiles!clinician_patients_patient_id_fkey(full_name)")
      .eq("clinician_id", user.id)
      .not("patient_id", "is", null)
      .ilike("display_name", `%${q}%`)
      .limit(5),
  ]);

  return {
    templates: (templatesRes.data ?? []).map((t) => ({ id: t.id, title: t.title })),
    patients: (patientsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.profiles?.full_name ?? p.display_name,
    })),
  };
}
