import Link from "next/link";
import { Users, LayoutTemplate, Send, ClipboardList, ArrowRight, Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import {
  getDashboardStats,
  getRecentAttempts,
  getCaseloadAttempts,
  getActivePatientsForAssignment,
} from "@/lib/data/clinician";
import { buildCaseloadPulse } from "@/lib/analytics/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CountUp } from "@/components/motion/count-up";
import { ClinicalPulse } from "@/components/clinician/pulse/clinical-pulse";
import { GlobalLibraryCard } from "@/components/library/global-library-card";
import type { PatientRefMap } from "@/components/clinician/pulse/types";
import { initials, formatDate } from "@/lib/utils";

export default async function ClinicianDashboardPage() {
  const { supabase, profile, user } = await requireProfile("clinician");
  const [stats, recentAttempts, caseloadAttempts, activePatients] = await Promise.all([
    getDashboardStats(supabase, user.id),
    getRecentAttempts(supabase, user.id),
    getCaseloadAttempts(supabase, user.id),
    getActivePatientsForAssignment(supabase, user.id),
  ]);

  // Resolve each patientId the analytics model references to a display name
  // and the caseload link that opens that patient. The analytics layer is
  // name-agnostic; names/links are a presentation concern assembled here.
  const patientRefs: PatientRefMap = {};
  const patientIds: string[] = [];
  for (const p of activePatients) {
    if (!p.patient_id) continue;
    const fullName = (p as unknown as { profiles?: { full_name?: string } }).profiles?.full_name;
    patientRefs[p.patient_id] = { name: fullName ?? p.display_name, caseloadLinkId: p.id };
    patientIds.push(p.patient_id);
  }
  const pulse = buildCaseloadPulse(caseloadAttempts, patientIds);

  const statCards = [
    {
      label: "Active patients",
      value: stats.activePatients,
      icon: Users,
      href: "/clinician/caseload",
      tint: "bg-primary/10 text-primary",
    },
    {
      label: "Published templates",
      value: stats.publishedTemplates,
      icon: LayoutTemplate,
      href: "/clinician/studio",
      tint: "bg-accent/15 text-accent",
    },
    {
      label: "Open assignments",
      value: stats.openAssignments,
      icon: Send,
      href: "/clinician/assignments",
      tint: "bg-[#b8923f]/10 text-[#8a6c2c]",
    },
    {
      label: "Total attempts logged",
      value: stats.totalAttempts,
      icon: ClipboardList,
      href: "/clinician/assignments",
      tint: "bg-[#8b5f72]/10 text-[#8b5f72]",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-semibold">Welcome back, {profile.full_name.split(" ")[0]}</h2>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your caseload.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/clinician/caseload">
              <Plus className="size-4" /> Add patient
            </Link>
          </Button>
          <Button asChild>
            <Link href="/clinician/studio">
              <Plus className="size-4" /> New template
            </Link>
          </Button>
        </div>
      </div>

      <GlobalLibraryCard role="clinician" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    <CountUp value={s.value} />
                  </p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
                <span className={`flex size-10 items-center justify-center rounded-xl ${s.tint}`}>
                  <s.icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {patientIds.length > 0 && <ClinicalPulse pulse={pulse} patients={patientRefs} />}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clinician/assignments">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentAttempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No completed activities yet. Once a patient finishes an assignment, it&apos;ll show up here.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentAttempts.map((a) => {
                const patientName =
                  (a as unknown as { profiles?: { full_name?: string } }).profiles?.full_name ??
                  "Patient";
                const assignmentTitle =
                  (a as unknown as { assignments?: { title?: string } }).assignments?.title ??
                  "Activity";
                return (
                  <div
                    key={a.id}
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
                  >
                    <Avatar>
                      <AvatarFallback>{initials(patientName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{patientName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        completed &ldquo;{assignmentTitle}&rdquo;
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {a.correct_count}/{a.total_count || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(a.completed_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
