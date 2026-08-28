"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/actions/notifications";

// Creating, retiring and removing a patient's therapy goals.
//
// Authorization is patient_goals_clinician_all: the policy's USING decides
// whose goals the caller can touch and its WITH CHECK pins clinician_id to
// the caller, so nothing here restates either. A goal for somebody else's
// patient fails at the database rather than passing a check in this file that
// could drift away from the policy.

export async function createGoal(formData: FormData): Promise<{ error: string | null }> {
  const patientId = String(formData.get("patient_id") || "");
  const clinicianPatientId = String(formData.get("clinician_patient_id") || "");
  const title = String(formData.get("title") || "").trim();
  const domainRaw = String(formData.get("domain") || "").trim();
  const target = Number(formData.get("target_accuracy") || 80);
  const windowAttempts = Number(formData.get("window_attempts") || 5);

  if (!patientId) return { error: "Missing patient." };
  if (!title) return { error: "Give the goal a name." };
  // Mirrors the CHECK constraints so a slip is a sentence rather than a
  // Postgres error string shown to a clinician.
  if (!Number.isFinite(target) || target < 1 || target > 100) {
    return { error: "Target accuracy must be between 1 and 100." };
  }
  if (!Number.isFinite(windowAttempts) || windowAttempts < 1 || windowAttempts > 50) {
    return { error: "Measure over between 1 and 50 activities." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("patient_goals").insert({
    patient_id: patientId,
    clinician_id: user.id,
    title,
    // "Any activity" is stored as null rather than a magic string, so the
    // measurement layer can test for it rather than compare against a label.
    domain: domainRaw === "" || domainRaw === "any" ? null : domainRaw,
    target_accuracy: Math.round(target),
    window_attempts: Math.round(windowAttempts),
  });

  if (error) return { error: error.message };

  await notify(
    supabase,
    patientId,
    "goal_set",
    "Your clinician set a new goal",
    title,
    "/patient/progress",
  );

  revalidatePath(`/clinician/caseload/${clinicianPatientId}`);
  return { error: null };
}

// Marking a goal achieved is deliberately the clinician's act, not something
// the measurement does on its own. goalProgress() says whether the bar has
// been cleared; whether that means the goal is *met* is a clinical judgement,
// and a goal that retired itself the moment a window happened to average 80%
// would take that judgement away.
export async function setGoalStatus(
  goalId: string,
  status: "active" | "achieved" | "archived",
  clinicianPatientId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_goals")
    .update({
      status,
      // The CHECK constraint ties these two together, so they move together.
      achieved_at: status === "achieved" ? new Date().toISOString() : null,
    })
    .eq("id", goalId)
    .select("patient_id, title")
    .maybeSingle();

  if (error) return { error: error.message };
  // RLS filters a forbidden UPDATE to zero rows rather than raising, so an
  // empty result is "not yours", not "nothing to do".
  if (!data) return { error: "That goal could not be updated." };

  if (status === "achieved") {
    await notify(
      supabase,
      data.patient_id,
      "goal_achieved",
      "Goal achieved",
      data.title,
      "/patient/progress",
    );
  }

  revalidatePath(`/clinician/caseload/${clinicianPatientId}`);
  return { error: null };
}

export async function deleteGoal(
  goalId: string,
  clinicianPatientId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("patient_goals").delete().eq("id", goalId);
  if (error) return { error: error.message };

  revalidatePath(`/clinician/caseload/${clinicianPatientId}`);
  return { error: null };
}
