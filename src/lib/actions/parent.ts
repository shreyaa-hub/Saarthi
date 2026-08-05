"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import { SELECTED_CHILD_COOKIE } from "@/lib/parent/selected-child";

export async function claimGuardianCode(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = String(formData.get("guardian_code") || "").trim().toUpperCase();
  if (!code) return { error: "Enter a guardian code." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_guardian_code", { p_guardian_code: code });

  if (error) return { error: error.message };

  revalidatePath("/parent", "layout");
  return { error: null, message: "Linked to your child" };
}

export async function selectChild(childId: string) {
  const store = await cookies();
  store.set(SELECTED_CHILD_COOKIE, childId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  // "layout" scope because the selector lives in the parent layout — every
  // screen under it renders against the newly chosen child, not just the one
  // currently on screen.
  revalidatePath("/parent", "layout");
}

export async function saveWorksheet(templateId: string, childId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("parent_saved_worksheets")
    .upsert(
      { parent_id: user.id, template_id: templateId, child_id: childId },
      { onConflict: "parent_id,template_id,child_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/parent/creator-hub");
  return { error: null };
}

export async function removeSavedWorksheet(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("parent_saved_worksheets")
    .delete()
    .eq("id", id)
    .eq("parent_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/parent/creator-hub");
  return { error: null };
}
