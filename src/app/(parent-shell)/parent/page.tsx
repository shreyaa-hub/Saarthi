import Link from "next/link";
import { ClipboardList, TrendingUp, CalendarDays, MessageSquare, ArrowRight, AlertTriangle } from "lucide-react";
import { getParentContext } from "@/lib/parent/context";
import { getChildAssignments, getChildAttempts } from "@/lib/data/parent";
import { buildPatientAnalytics } from "@/lib/analytics/models";
import type { AnalyticsAttempt } from "@/lib/analytics/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountUp } from "@/components/motion/count-up";
import { LinkChildCard } from "@/components/parent/link-child-card";
import { NoChildState } from "@/components/parent/no-child-state";
import { formatDate, pluralize, cn } from "@/lib/utils";

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default async function ParentDashboardPage() {
  const { supabase, profile, child } = await getParentContext();

  if (!child) {
    return (
      <NoChildState
        title={`Hi ${profile.full_name.split(" ")[0]}`}
        description="Connect to your child to follow their therapy activities and progress."
      />
    );
  }

  const [assignments, attempts] = await Promise.all([
    getChildAssignments(supabase, child.childId),
    getChildAttempts(supabase, child.childId),
  ]);

  // The same builder, over the same set, that the clinician's own screens
  // use — so a parent and a clinician looking at this child read identical
  // numbers, home practice included.
  const analyticsAttempts: AnalyticsAttempt[] = attempts.map((a) => ({
    patientId: child.childId,
    completedAt: a.completed_at,
    correctCount: a.correct_count,
    totalCount: a.total_count,
    domain: null,
  }));
  const analytics = buildPatientAnalytics(analyticsAttempts);

  const pending = assignments.filter((a) => a.status !== "completed");
  const overdue = pending.filter((a) => isOverdue(a.due_date, a.status));

  const stats = [
    {
      label: "Activities to do",
      value: pending.length,
      icon: ClipboardList,
      href: "/parent/missions",
      tint: "bg-primary/10 text-primary",
    },
    {
      label: "Completed all-time",
      value: analytics.summary.totalCompleted,
      icon: TrendingUp,
      href: "/parent/progress",
      tint: "bg-accent/15 text-accent",
    },
    {
      label: "Overdue",
      value: overdue.length,
      icon: AlertTriangle,
      href: "/parent/calendar",
      tint: "bg-[#b8923f]/10 text-[#8a6c2c]",
    },
    {
      label: "Active days",
      value: analytics.summary.activeDays,
      icon: CalendarDays,
      href: "/parent/progress",
      tint: "bg-[#8b5f72]/10 text-[#8b5f72]",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">
          Hi {profile.full_name.split(" ")[0]}, here&apos;s how {child.name.split(" ")[0]} is doing
        </h2>
        <p className="text-sm text-muted-foreground">
          {child.clinicianName ? `Working with ${child.clinicianName}` : "Not currently on a clinician's caseload"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex items-center gap-3 pt-6">
                <span className={cn("flex size-10 items-center justify-center rounded-xl", s.tint)}>
                  <s.icon className="size-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold">
                    <CountUp value={s.value} />
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Overall accuracy</p>
            <Link
              href="/parent/progress"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              See progress <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {analytics.summary.averageAccuracy === null ? (
            <p className="text-sm text-muted-foreground">
              No completed activities yet — results appear here once {child.name.split(" ")[0]} finishes their
              first one.
            </p>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold">{analytics.summary.averageAccuracy}%</span>
              <span className="text-sm text-muted-foreground">
                across {pluralize(analytics.summary.totalCompleted, "activity", "activities")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Coming up</h3>
          <Link href="/parent/missions" className="text-sm text-primary hover:underline">
            All missions
          </Link>
        </div>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                <ClipboardList className="size-6" />
              </span>
              <p className="font-medium">Nothing outstanding</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {child.name.split(" ")[0]} has finished everything assigned so far.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.slice(0, 6).map((a) => {
              const late = isOverdue(a.due_date, a.status);
              return (
                <Card key={a.id}>
                  <CardContent className="flex flex-col gap-2 pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{a.title}</p>
                      <Badge variant={late ? "outline" : "secondary"} className={cn(late && "border-destructive/40 text-destructive")}>
                        {late ? "Overdue" : a.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.due_date ? `Due ${formatDate(a.due_date)}` : "No due date"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="font-medium">Questions for {child.clinicianName ?? "the clinician"}?</p>
            <p className="text-sm text-muted-foreground">Message them directly from your Messages tab.</p>
          </div>
          <Link
            href="/parent/messages"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <MessageSquare className="size-4" /> Open Messages
          </Link>
        </CardContent>
      </Card>

      {/* A parent may guard more than one child, so the linking path stays
          reachable here rather than only appearing on an empty account. */}
      <LinkChildCard />
    </div>
  );
}
