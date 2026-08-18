"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_LENGTH = 500;

export async function addBlueprintRule(body: string) {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Write the rule first." };
  if (trimmed.length > MAX_LENGTH) {
    return { error: `Keep the rule under ${MAX_LENGTH} characters.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // created_by must be the caller — the insert policy enforces it, and it is
  // what lets every rule be attributed to whoever added it.
  const { error } = await supabase
    .from("blueprint_rules")
    .insert({ body: trimmed, created_by: user.id });

  if (error) return { error: error.message };

  // Rules are shown platform-wide, so every surface that renders them is
  // refreshed rather than just the page the clinician happened to be on.
  revalidatePath("/clinician", "layout");
  revalidatePath("/parent", "layout");
  return { error: null };
}

export async function removeBlueprintRule(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error, count } = await supabase
    .from("blueprint_rules")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { error: error.message };
  // RLS filters a refused delete to zero rows rather than raising, so a
  // silent no-op has to be reported explicitly or the UI would claim success.
  if (count === 0) {
    return { error: "That rule can't be removed — platform defaults are fixed." };
  }

  revalidatePath("/clinician", "layout");
  revalidatePath("/parent", "layout");
  return { error: null };
}
