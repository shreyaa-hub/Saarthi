"use server";

import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";

const inviteCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 7);

export async function invitePatient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const displayName = String(formData.get("display_name") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!displayName) {
    return { error: "Enter the patient's name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const code = inviteCode();
  const { error } = await supabase.from("clinician_patients").insert({
    clinician_id: user.id,
    display_name: displayName,
    invite_code: code,
    notes: notes || null,
    status: "invited",
  });

  if (error) return { error: error.message };

  revalidatePath("/clinician/caseload");
  return { error: null, message: code };
}

export async function archivePatient(clinicianPatientId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clinician_patients")
    .update({ status: "archived" })
    .eq("id", clinicianPatientId);

  revalidatePath("/clinician/caseload");
  return { error: error?.message ?? null };
}

export async function reactivatePatient(clinicianPatientId: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("clinician_patients")
    .select("patient_id")
    .eq("id", clinicianPatientId)
    .single();

  const { error } = await supabase
    .from("clinician_patients")
    .update({ status: row?.patient_id ? "active" : "invited" })
    .eq("id", clinicianPatientId);

  revalidatePath("/clinician/caseload");
  return { error: error?.message ?? null };
}
