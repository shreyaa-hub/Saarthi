"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import { notify } from "@/lib/actions/notifications";
import { repeatDueDates } from "@/lib/assignment-schedule";

// One assignment, several patients at once, or the same activity repeated
// across a stretch of days — all three are the same insert with a different
// number of rows, so they are one action rather than three that could drift.
//
// Repetition is materialised here, at assign time, rather than stored as a
// rule for something to expand later. That means no scheduler, no background
// job and no "why hasn't today's practice appeared" failure mode: the whole
// week exists the moment the clinician presses the button, and each day is an
// ordinary assignment they can edit or delete on its own.
const MAX_ROWS = 200;

export async function createAssignment(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const templateId = String(formData.get("template_id") || "");
  // getAll, so the same action serves the single-patient dialog (one hidden
  // field) and the bulk one (a checkbox per patient) without branching.
  const patientIds = [...new Set(formData.getAll("patient_id").map(String).filter(Boolean))];
  const clinicianPatientId = String(formData.get("clinician_patient_id") || "");
  const instructions = String(formData.get("instructions") || "").trim();
  const dueDate = String(formData.get("due_date") || "");
  const repeatCount = Number(formData.get("repeat_count") || 1);
  const repeatEveryDays = Number(formData.get("repeat_every_days") || 1);

  if (!templateId) return { error: "Pick a template." };
  if (patientIds.length === 0) return { error: "Pick at least one patient." };

  const occurrences = Number.isFinite(repeatCount) ? Math.round(repeatCount) : 1;
  const everyDays = Number.isFinite(repeatEveryDays) ? Math.round(repeatEveryDays) : 1;
  if (occurrences < 1 || occurrences > 30) {
    return { error: "Repeat between 1 and 30 times." };
  }
  if (everyDays < 1 || everyDays > 30) {
    return { error: "Repeat every 1 to 30 days." };
  }
  // Each repeat is distinguished only by its due date, so without one they
  // would be N identical rows the patient cannot tell apart.
  if (occurrences > 1 && !dueDate) {
    return { error: "Set a due date — repeats are spaced out from it." };
  }
  if (patientIds.length * occurrences > MAX_ROWS) {
    return {
      error: `That would create ${patientIds.length * occurrences} assignments. Keep it under ${MAX_ROWS}.`,
    };
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

  const dueDates = repeatDueDates(dueDate, occurrences, everyDays);

  const rows = patientIds.flatMap((patientId) =>
    dueDates.map((due) => ({
      template_id: templateId,
      clinician_id: user.id,
      assigned_by: user.id,
      patient_id: patientId,
      title: template.title,
      instructions: instructions || null,
      due_date: due,
      canvas_snapshot: template.canvas,
      status: "assigned" as const,
    })),
  );

  const { error } = await supabase.from("assignments").insert(rows);
  if (error) return { error: error.message };

  // One notification per patient however many days were scheduled — a week of
  // practice is one piece of news, and seven identical alerts is how a
  // notification bell stops being read at all.
  const body =
    occurrences > 1 ? `${template.title} · ${occurrences} sessions` : template.title;
  await Promise.all(
    patientIds.map((patientId) =>
      notify(supabase, patientId, "new_assignment", "New activity assigned", body, "/patient"),
    ),
  );

  // Empty when assigning in bulk from the caseload page, where there is no
  // single caseload row to revalidate.
  if (clinicianPatientId) revalidatePath(`/clinician/caseload/${clinicianPatientId}`);
  revalidatePath("/clinician/caseload");
  revalidatePath("/clinician/assignments");
  return {
    error: null,
    message: "Assigned",
    // Said plainly, because "Assigned" after creating twenty rows tells the
    // clinician nothing about what actually happened.
    detail: describeAssigned(patientIds.length, occurrences),
  };
}

function describeAssigned(patients: number, occurrences: number): string {
  const who = patients === 1 ? "1 patient" : `${patients} patients`;
  if (occurrences === 1) return `Assigned to ${who}.`;
  return `Assigned to ${who}, ${occurrences} sessions each — ${patients * occurrences} in total.`;
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
