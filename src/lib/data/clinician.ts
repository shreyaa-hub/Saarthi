import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/clinician] ${context}:`, error.message, error.details);
}

export async function getDashboardStats(supabase: Client, clinicianId: string) {
  const [patients, templates, assignments, attempts] = await Promise.all([
    supabase
      .from("clinician_patients")
      .select("id", { count: "exact", head: true })
      .eq("clinician_id", clinicianId)
      .eq("status", "active"),
    supabase
      .from("templates")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", clinicianId)
      .eq("status", "published"),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("clinician_id", clinicianId)
      .neq("status", "completed"),
    supabase
      .from("activity_attempts")
      .select("id, assignments!inner(clinician_id)", { count: "exact", head: true })
      .eq("assignments.clinician_id", clinicianId),
  ]);

  logIfError("getDashboardStats:patients", patients.error);
  logIfError("getDashboardStats:templates", templates.error);
  logIfError("getDashboardStats:assignments", assignments.error);
  logIfError("getDashboardStats:attempts", attempts.error);

  return {
    activePatients: patients.count ?? 0,
    publishedTemplates: templates.count ?? 0,
    openAssignments: assignments.count ?? 0,
    totalAttempts: attempts.count ?? 0,
  };
}

export async function getRecentAttempts(supabase: Client, clinicianId: string, limit = 6) {
  const { data, error } = await supabase
    .from("activity_attempts")
    .select(
      "id, score, correct_count, total_count, completed_at, patient_id, assignments!inner(id, title, clinician_id), profiles!activity_attempts_patient_id_fkey(full_name)",
    )
    .eq("assignments.clinician_id", clinicianId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  logIfError("getRecentAttempts", error);
  return data ?? [];
}

export async function getCaseload(supabase: Client, clinicianId: string) {
  const { data, error } = await supabase
    .from("clinician_patients")
    .select("*, profiles!clinician_patients_patient_id_fkey(full_name, email)")
    .eq("clinician_id", clinicianId)
    .order("created_at", { ascending: false });

  logIfError("getCaseload", error);
  return data ?? [];
}

export async function getPatientDetail(
  supabase: Client,
  clinicianId: string,
  clinicianPatientId: string,
) {
  const { data: link, error: linkError } = await supabase
    .from("clinician_patients")
    .select("*, profiles!clinician_patients_patient_id_fkey(full_name, email)")
    .eq("clinician_id", clinicianId)
    .eq("id", clinicianPatientId)
    .single();

  logIfError("getPatientDetail:link", linkError);
  if (!link) return null;

  const [assignmentsRes, insightsRes] = await Promise.all([
    link.patient_id
      ? supabase
          .from("assignments")
          .select("*")
          .eq("clinician_id", clinicianId)
          .eq("patient_id", link.patient_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    link.patient_id
      ? supabase
          .from("ai_insights")
          .select("*")
          .eq("clinician_id", clinicianId)
          .eq("patient_id", link.patient_id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  logIfError("getPatientDetail:assignments", assignmentsRes.error);
  logIfError("getPatientDetail:insights", insightsRes.error);

  const assignments = assignmentsRes.data ?? [];
  const assignmentIds = assignments.map((a) => a.id);

  const { data: attempts, error: attemptsError } = assignmentIds.length
    ? await supabase
        .from("activity_attempts")
        .select("*")
        .in("assignment_id", assignmentIds)
        .order("completed_at", { ascending: true })
    : { data: [], error: null };

  logIfError("getPatientDetail:attempts", attemptsError);

  return {
    link,
    assignments,
    attempts: attempts ?? [],
    latestInsight: insightsRes.data ?? null,
  };
}

export async function getTemplates(supabase: Client, ownerId: string) {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  logIfError("getTemplates", error);
  return data ?? [];
}

export async function getTrashedTemplates(supabase: Client, ownerId: string) {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("owner_id", ownerId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  logIfError("getTrashedTemplates", error);
  return data ?? [];
}

export async function getAssignments(supabase: Client, clinicianId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("*, profiles!assignments_patient_id_fkey(full_name)")
    .eq("clinician_id", clinicianId)
    .order("created_at", { ascending: false });

  logIfError("getAssignments", error);
  return data ?? [];
}

export async function getActivePatientsForAssignment(supabase: Client, clinicianId: string) {
  const { data, error } = await supabase
    .from("clinician_patients")
    .select("id, patient_id, display_name, profiles!clinician_patients_patient_id_fkey(full_name)")
    .eq("clinician_id", clinicianId)
    .eq("status", "active")
    .not("patient_id", "is", null);

  logIfError("getActivePatientsForAssignment", error);
  return data ?? [];
}
