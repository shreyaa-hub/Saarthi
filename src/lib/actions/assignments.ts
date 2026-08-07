"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import { notify } from "@/lib/actions/notifications";

export async function createAssignment(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const templateId = String(formData.get("template_id") || "");
  const patientId = String(formData.get("patient_id") || "");
  const clinicianPatientId = String(formData.get("clinician_patient_id") || "");
  const instructions = String(formData.get("instructions") || "").trim();
  const dueDate = String(formData.get("due_date") || "");

  if (!templateId || !patientId) {
    return { error: "Pick a template." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: template } = await supabase
    .from("templates")
    .select("title, canvas")
    .eq("id", templateId)
    .eq("owner_id", user.id)
    .single();

  if (!template) return { error: "Template not found." };

  const { error } = await supabase.from("assignments").insert({
    template_id: templateId,
    clinician_id: user.id,
    assigned_by: user.id,
    patient_id: patientId,
    title: template.title,
    instructions: instructions || null,
    due_date: dueDate || null,
    canvas_snapshot: template.canvas,
    status: "assigned",
  });

  if (error) return { error: error.message };

  await notify(
    supabase,
    patientId,
    "new_assignment",
    "New activity assigned",
    template.title,
    "/patient",
  );

  revalidatePath(`/clinician/caseload/${clinicianPatientId}`);
  revalidatePath("/clinician/assignments");
  return { error: null, message: "Assigned" };
}

export async function markAssignmentInProgress(assignmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ status: "in_progress" })
    .eq("id", assignmentId)
    .eq("status", "assigned");
  return { error: error?.message ?? null };
}

export async function markAssignmentCompleted(assignmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ status: "completed" })
    .eq("id", assignmentId);
  return { error: error?.message ?? null };
}
