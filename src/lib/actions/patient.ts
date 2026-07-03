"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import type { Json } from "@/lib/types/database";

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

  await supabase.from("assignments").update({ status: "completed" }).eq("id", assignmentId);

  revalidatePath("/patient");
  revalidatePath(`/patient/activity/${assignmentId}`);
  return { error: null, score };
}
