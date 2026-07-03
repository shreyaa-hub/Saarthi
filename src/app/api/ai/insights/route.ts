import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInsights, type AttemptSummary } from "@/lib/ai/insights";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const clinicianPatientId = body?.clinicianPatientId as string | undefined;
  if (!clinicianPatientId) {
    return NextResponse.json({ error: "Missing clinicianPatientId." }, { status: 400 });
  }

  const { data: link } = await supabase
    .from("clinician_patients")
    .select("patient_id, display_name, profiles!clinician_patients_patient_id_fkey(full_name)")
    .eq("id", clinicianPatientId)
    .eq("clinician_id", user.id)
    .single();

  if (!link || !link.patient_id) {
    return NextResponse.json({ error: "Patient not found or not yet linked." }, { status: 404 });
  }

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title")
    .eq("clinician_id", user.id)
    .eq("patient_id", link.patient_id);

  const assignmentTitleById = new Map((assignments ?? []).map((a) => [a.id, a.title]));
  const assignmentIds = (assignments ?? []).map((a) => a.id);

  if (assignmentIds.length === 0) {
    return NextResponse.json({ error: "No assignments yet for this patient." }, { status: 400 });
  }

  const { data: attempts } = await supabase
    .from("activity_attempts")
    .select("assignment_id, completed_at, correct_count, total_count, duration_seconds")
    .in("assignment_id", assignmentIds)
    .order("completed_at", { ascending: false })
    .limit(15);

  if (!attempts || attempts.length === 0) {
    return NextResponse.json(
      { error: "This patient hasn't completed any activities yet." },
      { status: 400 },
    );
  }

  const summaries: AttemptSummary[] = [...attempts].reverse().map((a) => ({
    activityTitle: assignmentTitleById.get(a.assignment_id) ?? "Activity",
    completedAt: new Date(a.completed_at).toISOString().slice(0, 10),
    correctCount: a.correct_count,
    totalCount: a.total_count,
    durationSeconds: a.duration_seconds,
  }));

  const patientName = link.profiles?.full_name ?? link.display_name;

  try {
    const insight = await generateInsights(patientName, summaries);

    const { data: saved, error } = await supabase
      .from("ai_insights")
      .insert({
        patient_id: link.patient_id,
        clinician_id: user.id,
        summary: insight.summary,
        strengths: insight.strengths,
        concerns: insight.concerns,
        recommendations: insight.recommendations,
        attempts_considered: summaries.length,
      })
      .select("*")
      .single();

    if (error || !saved) {
      return NextResponse.json({ error: error?.message ?? "Could not save insight." }, { status: 500 });
    }

    return NextResponse.json({ insight: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI insight generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
