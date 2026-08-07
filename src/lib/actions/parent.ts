"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import { EMPTY_WORKSHEET_CANVAS } from "@/lib/types/canvas";
import { randomThumbnailColor } from "@/lib/canvas/colors";
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

// Parent-authored worksheets are public by default, per the product decision
// that parents share what they make with the community unless they opt out.
// This is the opposite default from clinician templates, which start private —
// so it is set explicitly here rather than relying on the column default,
// which stays false for clinicians.
export async function createParentWorksheet(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") || "").trim();
  const domain = String(formData.get("domain") || "General");
  const keepPrivate = formData.get("keep_private") === "on";

  if (!title) return { error: "Give your worksheet a name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("templates")
    .insert({
      owner_id: user.id,
      title,
      domain,
      medium: "print",
      canvas: EMPTY_WORKSHEET_CANVAS,
      is_public: !keepPrivate,
      thumbnail_color: randomThumbnailColor(),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create the worksheet." };

  revalidatePath("/parent/creator-hub");
  redirect(`/parent/worksheets/${data.id}`);
}

export async function setParentWorksheetVisibility(templateId: string, isPublic: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("templates")
    .update({ is_public: isPublic })
    .eq("id", templateId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/parent/creator-hub");
  return { error: null };
}

export async function deleteParentWorksheet(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Soft delete, matching how the clinician Studio removes a template — the
  // row stays recoverable rather than being destroyed outright.
  const { error } = await supabase
    .from("templates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/parent/creator-hub");
  return { error: null };
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
