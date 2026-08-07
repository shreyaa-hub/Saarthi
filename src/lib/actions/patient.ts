"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import type { Json } from "@/lib/types/database";
import { notify } from "@/lib/actions/notifications";

export async function claimInviteCode(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = String(formData.get("invite_code") || "").trim().toUpperCase();
  if (!code) return { error: "Enter an invite code." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_invite", { p_invite_code: code });

  if (error) return { error: error.message };

  revalidatePath("/patient");
  return { error: null, message: "Linked to your clinician" };
}

export async function submitAttempt(
  assignmentId: string,
  payload: {
    responses: Record<string, unknown>;
    correctCount: number;
    totalCount: number;
    durationSeconds: number;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const score = payload.totalCount > 0 ? Math.round((payload.correctCount / payload.totalCount) * 100) : 100;

  const { error: attemptError } = await supabase.from("activity_attempts").insert({
    assignment_id: assignmentId,
    patient_id: user.id,
    responses: payload.responses as Json,
    correct_count: payload.correctCount,
    total_count: payload.totalCount,
    duration_seconds: payload.durationSeconds,
    score,
  });

  if (attemptError) return { error: attemptError.message };

  const [{ data: assignment }, { data: profile }] = await Promise.all([
    supabase
      .from("assignments")
      .update({ status: "completed" })
      .eq("id", assignmentId)
      .select("clinician_id, assigned_by, title")
      .single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  if (assignment) {
    // Notify whoever assigned the work, not the clinician specifically — a
    // parent-assigned worksheet has no clinician, and for clinician-assigned
    // work assigned_by is the clinician anyway, so this is the same
    // notification it always was in that case.
    const assignedByClinician = assignment.assigned_by === assignment.clinician_id;
    await notify(
      supabase,
      assignment.assigned_by,
      "attempt_completed",
      `${profile?.full_name ?? "A patient"} completed an activity`,
      `${assignment.title} — ${score}%`,
      assignedByClinician ? "/clinician/assignments" : "/parent/missions",
    );
  }

  revalidatePath("/patient");
  revalidatePath(`/patient/activity/${assignmentId}`);
  return { error: null, score };
}
