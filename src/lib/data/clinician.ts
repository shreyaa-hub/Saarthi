import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { AnalyticsAttempt } from "@/lib/analytics/types";
import { buildPatientAnalytics } from "@/lib/analytics/models";
import { buildTrend } from "@/lib/analytics/trends";

type Client = SupabaseClient<Database>;

function logIfError(context: string, error: PostgrestError | null) {
  if (error) console.error(`[data/clinician] ${context}:`, error.message, error.details);
}

// Shape of an activity_attempts row selected with its therapy domain joined
// through assignment -> template. `assignments` is a to-one relation (inner
// join keeps only the clinician's own attempts); `templates` is to-one and
// nullable — null when the assignment's template was deleted
// (assignments.template_id is ON DELETE SET NULL), which is exactly how an
// attempt ends up with no resolvable domain. Supabase's generated types model
// these nested relations loosely, so we cast the select result to this shape
// — matching the defensive-cast style already used elsewhere in this file.
type AttemptWithDomainRow = {
  patient_id: string;
  completed_at: string;
  correct_count: number;
  total_count: number;
  assignments: { templates: { domain: string } | null } | null;
};

const ATTEMPT_WITH_DOMAIN_SELECT =
  "patient_id, completed_at, correct_count, total_count, assignments!inner(clinician_id, patient_id, templates(domain))";

function normalizeAttemptWithDomain(row: AttemptWithDomainRow): AnalyticsAttempt {
  return {
    patientId: row.patient_id,
    completedAt: row.completed_at,
    correctCount: row.correct_count,
    totalCount: row.total_count,
    domain: row.assignments?.templates?.domain ?? null,
  };
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
      // Scoped by RLS (assignments_assigner_select) rather than by
      // clinician_id, so parent-assigned home practice for this clinician's
      // patients is counted too. Filtering on clinician_id here would silently
      // exclude it, since a parent assignment has none.
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .neq("status", "completed"),
    supabase
      .from("activity_attempts")
      .select("id", { count: "exact", head: true }),
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

// Patient/assignment/insight metadata only — attempt history is a separate
// concern, owned entirely by getPatientAttempts(). This used to also fetch
// attempts itself (filtered by this patient's assignment ids), which
// duplicated getPatientAnalyticsAttempts's own attempts query for the same
// rows; callers now fetch attempts once, from one place.
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
          // patient_id is the explicit scope; no clinician_id filter, so a
          // parent-assigned worksheet shows up here too. RLS still limits
          // this to patients on the caller's own caseload.
          .from("assignments")
          .select("*")
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

  return {
    link,
    assignments: assignmentsRes.data ?? [],
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

// Every assignment across the caller's caseload, whoever created it. Scoped
// entirely by RLS to the authenticated user, so it deliberately takes no
// clinician id — passing one would imply this can read another clinician's
// caseload, which it cannot.
export async function getAssignments(supabase: Client) {
  const { data, error } = await supabase
    // Scoped by RLS to this clinician's caseload rather than by clinician_id,
    // which is what lets parent-assigned home practice appear alongside the
    // clinician's own assignments.
    .from("assignments")
    .select("*, profiles!assignments_patient_id_fkey(full_name)")
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

// ---------------------------------------------------------------------------
// Analytics fetchers (Clinical Pulse / Performance Analytics). These return
// AnalyticsAttempt[] — the normalized shape the analytics layer consumes —
// and do no aggregation themselves: DB -> fetcher -> analytics layer -> UI.
// RLS (activity_attempts_clinician_select) already scopes every row to the
// calling clinician; the explicit clinician_id filters below also let
// PostgREST use the assignment index rather than scanning.
// ---------------------------------------------------------------------------

// Caseload-wide attempts over a bounded recent window (default 60 days) —
// enough to power this-week/last-week comparisons plus a daily caseload
// trend, without pulling a clinician's entire history for a dashboard glance.
export async function getCaseloadAttempts(
  supabase: Client,
  clinicianId: string,
  sinceDays = 60,
): Promise<AnalyticsAttempt[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("activity_attempts")
    .select(ATTEMPT_WITH_DOMAIN_SELECT)
    // No clinician_id filter: activity_attempts_clinician_select scopes this
    // to the caller's own caseload by care relationship, which is what admits
    // parent-assigned home practice (it has no clinician_id to match on).
    .gte("completed_at", since)
    .order("completed_at", { ascending: true });

  logIfError("getCaseloadAttempts", error);
  return ((data ?? []) as unknown as AttemptWithDomainRow[]).map(normalizeAttemptWithDomain);
}

// One patient's complete attempt history — the single canonical source for
// everything on the patient detail page that needs attempt data, whether
// that's the domain-resolved analytics (Overview) or the operational
// per-attempt record (Activity tab: title lookup via assignment_id, score,
// clinician_note). Unbounded on purpose — Performance Analytics and the
// Phase 5 printable report both show long-term/all-time trends.
//
// Callers project this one record into whatever shape they need (e.g. the
// AnalyticsAttempt subset for buildPatientAnalytics, or the snake_case shape
// AttemptNotes expects) — that projection is a pure, zero-fetch-cost
// .map() done at the call site, not a second query. This replaces the
// former getPatientAnalyticsAttempts AND the attempts sub-query that used
// to live inside getPatientDetail; both fetched overlapping rows from the
// same table on the same page load.
export type PatientAttemptRecord = {
  id: string;
  assignmentId: string;
  patientId: string;
  completedAt: string;
  correctCount: number;
  totalCount: number;
  score: number | null;
  clinicianNote: string | null;
  durationSeconds: number | null;
  domain: string | null;
};

type PatientAttemptRow = {
  id: string;
  assignment_id: string;
  patient_id: string;
  completed_at: string;
  correct_count: number;
  total_count: number;
  score: number | null;
  clinician_note: string | null;
  duration_seconds: number | null;
  assignments: { templates: { domain: string } | null } | null;
};

const PATIENT_ATTEMPT_SELECT =
  "id, assignment_id, patient_id, completed_at, correct_count, total_count, score, clinician_note, duration_seconds, assignments!inner(clinician_id, patient_id, templates(domain))";

function normalizePatientAttempt(row: PatientAttemptRow): PatientAttemptRecord {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    patientId: row.patient_id,
    completedAt: row.completed_at,
    correctCount: row.correct_count,
    totalCount: row.total_count,
    score: row.score,
    clinicianNote: row.clinician_note,
    durationSeconds: row.duration_seconds,
    domain: row.assignments?.templates?.domain ?? null,
  };
}

export async function getPatientAttempts(
  supabase: Client,
  clinicianId: string,
  patientId: string,
): Promise<PatientAttemptRecord[]> {
  const { data, error } = await supabase
    .from("activity_attempts")
    .select(PATIENT_ATTEMPT_SELECT)
    // patient_id stays as an explicit scope; the clinician_id filter is gone
    // so home practice is included. RLS still guarantees the caller may only
    // read attempts for a patient they actually treat.
    .eq("assignments.patient_id", patientId)
    .order("completed_at", { ascending: true });

  logIfError("getPatientAttempts", error);
  return ((data ?? []) as unknown as PatientAttemptRow[]).map(normalizePatientAttempt);
}

// The shared "fetch + project + analyze" sequence for one patient's attempt
// history — both the live Overview/Activity page and the printable report
// need the exact same two projections of the exact same fetch, so this is
// the one place that does it. Callers get back everything they need without
// re-deriving it: the raw records, the analytics model (unchanged —
// buildPatientAnalytics/buildTrend are called exactly as before), and the
// AttemptNotes-shaped rows. patientId is nullable so callers can pass
// link.patient_id directly rather than branching at the call site.
export async function getPatientPerformanceData(
  supabase: Client,
  clinicianId: string,
  patientId: string | null,
) {
  const patientAttempts = patientId ? await getPatientAttempts(supabase, clinicianId, patientId) : [];

  const analyticsAttempts: AnalyticsAttempt[] = patientAttempts.map((a) => ({
    patientId: a.patientId,
    completedAt: a.completedAt,
    correctCount: a.correctCount,
    totalCount: a.totalCount,
    domain: a.domain,
  }));

  const attemptRows = patientAttempts.map((a) => ({
    id: a.id,
    assignment_id: a.assignmentId,
    score: a.score,
    correct_count: a.correctCount,
    total_count: a.totalCount,
    clinician_note: a.clinicianNote,
    completed_at: a.completedAt,
  }));

  return {
    patientAttempts,
    attemptRows,
    // Returned as well as consumed: goal progress is measured against the
    // same normalized attempts the analytics are built from, so a goal and
    // the accuracy figure above it can never be computed from different rows.
    analyticsAttempts,
    analytics: buildPatientAnalytics(analyticsAttempts),
    weeklyTrend: buildTrend(analyticsAttempts, "week"),
  };
}

// --- Billing -----------------------------------------------------------

// The guardians a clinician may bill: parents of patients on their own active
// caseload. Scoped by RLS (profiles_select_my_patients_guardians and
// parent_children_clinician_select), which is also exactly what can_bill()
// enforces on write — so what this offers and what the database accepts
// cannot drift apart.
export type BillableParent = {
  parentId: string;
  parentName: string;
  childId: string;
  childName: string;
};

type GuardianRow = {
  parent_id: string;
  child_id: string;
  profiles: { full_name: string } | null;
  child: { full_name: string } | null;
};

export async function getBillableParents(supabase: Client): Promise<BillableParent[]> {
  const { data, error } = await supabase
    .from("parent_children")
    .select(
      "parent_id, child_id, " +
        "profiles!parent_children_parent_id_fkey(full_name), " +
        "child:profiles!parent_children_child_id_fkey(full_name)",
    )
    .order("created_at", { ascending: true });

  logIfError("getBillableParents", error);
  return ((data ?? []) as unknown as GuardianRow[]).map((row) => ({
    parentId: row.parent_id,
    parentName: row.profiles?.full_name ?? "Parent",
    childId: row.child_id,
    childName: row.child?.full_name ?? "Child",
  }));
}

export async function getIssuedInvoices(supabase: Client, clinicianId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, parent:profiles!invoices_parent_id_fkey(full_name)")
    .eq("clinician_id", clinicianId)
    .order("issued_at", { ascending: false });

  logIfError("getIssuedInvoices", error);
  return data ?? [];
}
