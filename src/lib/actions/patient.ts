"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import type { Json } from "@/lib/types/database";
import { notify } from "@/lib/actions/notifications";
import { scoreCanvas } from "@/lib/scoring";

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

// Records a completed attempt.
//
// The marks are worked out HERE, from the activity as it was assigned. They
// used to arrive from the browser — the player scored the canvas locally and
// posted correctCount and totalCount, which were inserted verbatim. Anyone
// able to call this server action could therefore record any score they liked
// against any activity, and every figure built on top of it (the accuracy
// tiles, the trend, the domain breakdown, goal progress) would repeat it
// faithfully. 0008 stopped a patient editing an attempt after the fact; this
// closes the same hole on the way in, which that migration had to leave open
// because inserting an attempt is the one write a patient legitimately makes.
//
// Only `responses` is taken from the client now, because it is the only thing
// the client actually knows: what the patient did. What that is worth is not
// the client's to say.
export async function submitAttempt(
  assignmentId: string,
  payload: {
    responses: Record<string, unknown>;
    durationSeconds: number;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Scoped to the caller's own assignment, which does two jobs: it fetches
  // the canvas to mark against, and it refuses an assignment that is not
  // theirs — previously unchecked, so an attempt could be filed against
  // somebody else's activity.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("clinician_id, assigned_by, title, canvas_snapshot")
    .eq("id", assignmentId)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (!assignment?.canvas_snapshot) {
    return { error: "That activity isn't assigned to you." };
  }

  // canvas_snapshot, not the live template: the patient answered the copy
  // taken when it was assigned, and marking against anything else would
  // score them on questions they were never asked.
  const { correct, total } = scoreCanvas(assignment.canvas_snapshot, payload.responses);
  const score = total > 0 ? Math.round((correct / total) * 100) : 100;

  // Also client-supplied and only a soft metric, but a negative or absurd
  // value would still skew the duration averages, so it is clamped to
  // something a real sitting could produce (capped at six hours).
  const durationSeconds = Number.isFinite(payload.durationSeconds)
    ? Math.min(21_600, Math.max(0, Math.round(payload.durationSeconds)))
    : 0;

  const { error: attemptError } = await supabase.from("activity_attempts").insert({
    assignment_id: assignmentId,
    patient_id: user.id,
    responses: payload.responses as Json,
    correct_count: correct,
    total_count: total,
    duration_seconds: durationSeconds,
    score,
  });

  if (attemptError) return { error: attemptError.message };

  const [, { data: profile }] = await Promise.all([
    supabase.from("assignments").update({ status: "completed" }).eq("id", assignmentId),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

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

  revalidatePath("/patient");
  revalidatePath(`/patient/activity/${assignmentId}`);
  // The player shows what was actually recorded, so the screen the patient
  // sees and the row the clinician reads can never disagree.
  return { error: null, score, correct, total };
}
