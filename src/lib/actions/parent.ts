"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import {
  EMPTY_CANVAS,
  EMPTY_WORKSHEET_CANVAS,
  TEMPLATE_MEDIUMS,
  type TemplateMedium,
} from "@/lib/types/canvas";
import { randomThumbnailColor } from "@/lib/canvas/colors";
import { notify } from "@/lib/actions/notifications";
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

function asMedium(value: FormDataEntryValue | null): TemplateMedium {
  const candidate = String(value ?? "");
  return (TEMPLATE_MEDIUMS as readonly string[]).includes(candidate)
    ? (candidate as TemplateMedium)
    : "print";
}

// Parents author the same thing clinicians do — a template — not a lesser
// kind of it. An interactive or hybrid medium gets the activity canvas; print
// gets the worksheet canvas, exactly as the Studio decides it.
//
// Public by default, per the product decision that parents share what they
// make unless they opt out. This is the opposite default from clinician
// templates, which start private, so it is set explicitly here rather than
// relying on the column default, which stays false for clinicians.
export async function createParentTemplate(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") || "").trim();
  const domain = String(formData.get("domain") || "General");
  const medium = asMedium(formData.get("medium"));
  const keepPrivate = formData.get("keep_private") === "on";

  if (!title) return { error: "Give it a name." };

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
      medium,
      canvas: medium === "print" ? EMPTY_WORKSHEET_CANVAS : EMPTY_CANVAS,
      is_public: !keepPrivate,
      thumbnail_color: randomThumbnailColor(),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create it." };

  revalidatePath("/parent/creator-hub");
  redirect(`/parent/studio/${data.id}`);
}

export async function setParentTemplateVisibility(templateId: string, isPublic: boolean) {
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

export async function deleteParentTemplate(templateId: string) {
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

// Pushes a worksheet into the child's own mission list. clinician_id is left
// null: no clinician is involved in a parent-assigned activity, and writing
// the parent's id into a column meaning "the clinician responsible for this
// patient" would corrupt every clinician-scoped query that filters on it.
//
// Authorization is not enforced here — it is enforced by the
// assignments_assigner_insert policy, which requires can_assign_to(patient_id).
// The child_id check below exists so a mistake surfaces as a clear message
// rather than an opaque RLS rejection.
export async function assignTemplateToChild(
  templateId: string,
  childId: string,
  options: { instructions?: string; dueDate?: string } = {},
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: link } = await supabase
    .from("parent_children")
    .select("id")
    .eq("parent_id", user.id)
    .eq("child_id", childId)
    .maybeSingle();
  if (!link) return { error: "That isn't one of your children." };

  // Own worksheets, or anything published to the library. is_public rows are
  // readable by everyone through templates_public_select, so a parent can
  // assign material a clinician shared without having to copy it first.
  const { data: template } = await supabase
    .from("templates")
    .select("title, canvas, owner_id, is_public")
    .eq("id", templateId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!template) return { error: "That could not be found." };
  if (template.owner_id !== user.id && !template.is_public) {
    return { error: "That isn't yours and isn't publicly shared." };
  }

  const { error } = await supabase.from("assignments").insert({
    template_id: templateId,
    clinician_id: null,
    assigned_by: user.id,
    patient_id: childId,
    title: template.title,
    instructions: options.instructions?.trim() || null,
    due_date: options.dueDate || null,
    // Snapshotted, exactly as clinician assignments are, so editing the
    // worksheet later doesn't retroactively change work already sent.
    canvas_snapshot: template.canvas,
    status: "assigned",
  });

  if (error) return { error: error.message };

  await notify(
    supabase,
    childId,
    "new_assignment",
    "New activity from home",
    template.title,
    "/patient",
  );

  revalidatePath("/parent/missions");
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
