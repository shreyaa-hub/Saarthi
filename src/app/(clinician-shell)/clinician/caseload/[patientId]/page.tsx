import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getPatientDetail, getPatientAnalyticsAttempts } from "@/lib/data/clinician";
import { buildPatientAnalytics } from "@/lib/analytics/models";
import { buildTrend } from "@/lib/analytics/trends";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initials, formatDate } from "@/lib/utils";
import { AssignTemplateDialog } from "@/components/clinician/assign-template-dialog";
import { PatientInsightsPanel } from "@/components/clinician/patient-insights-panel";
import { AttemptNotes } from "@/components/clinician/attempt-notes";
import { MessageThread } from "@/components/clinician/message-thread";
import { PatientPerformancePanel } from "@/components/clinician/analytics/patient-performance-panel";
import { getTemplates } from "@/lib/data/clinician";
import { startConversation } from "@/lib/actions/messages";
import { getMessages } from "@/lib/data/messages";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, "success" | "secondary" | "outline"> = {
  completed: "success",
  in_progress: "secondary",
  assigned: "outline",
};

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const { supabase, user } = await requireProfile("clinician");
  const [detail, templates] = await Promise.all([
    getPatientDetail(supabase, user.id, patientId),
    getTemplates(supabase, user.id),
  ]);

  if (!detail) notFound();

  const { link, assignments, attempts, latestInsight } = detail;
  const name = link.profiles?.full_name ?? link.display_name;
  const publishedTemplates = templates.filter((t) => t.status === "published");
  const titleByAssignment = Object.fromEntries(assignments.map((a) => [a.id, a.title]));

  // Performance Analytics: domain-resolved attempts -> analytics model. Only
  // reachable once the patient has claimed their invite (no patient_id, no
  // attempts). The weekly trend is precomputed here so the client trend chart
  // can toggle to it without importing the analytics layer.
  const analyticsAttempts = link.patient_id
    ? await getPatientAnalyticsAttempts(supabase, user.id, link.patient_id)
    : [];
  const analytics = buildPatientAnalytics(analyticsAttempts);
  const weeklyTrend = buildTrend(analyticsAttempts, "week");

  // Get-or-create the conversation and load its first page of history. Only
  // possible once the patient has claimed their invite (start_conversation
  // requires an active clinician_patients link on both sides).
  let messagesTab: {
    conversationId: string;
    initialMessages: Awaited<ReturnType<typeof getMessages>>["messages"];
    initialCursor: Awaited<ReturnType<typeof getMessages>>["nextCursor"];
  } | null = null;

  if (link.patient_id) {
    const { conversation } = await startConversation(link.id);
    if (conversation) {
      const page = await getMessages(supabase, conversation.id);
      messagesTab = {
        conversationId: conversation.id,
        initialMessages: page.messages,
        initialCursor: page.nextCursor,
      };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/clinician/caseload"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to caseload
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-base">{initials(name)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold">{name}</h2>
            <p className="text-sm text-muted-foreground">
              {link.profiles?.email ?? "Not yet linked"} · On roster since {formatDate(link.created_at)}
            </p>
          </div>
        </div>
        {link.patient_id && (
          <AssignTemplateDialog
            patientId={link.patient_id}
            clinicianPatientId={link.id}
            templates={publishedTemplates}
          />
        )}
      </div>

      {!link.patient_id && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            This patient hasn&apos;t claimed their invite code (<span className="font-mono font-medium text-foreground">{link.invite_code}</span>) yet.
            Assignments will be available once they sign in and link their account.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Single-column reading order: understand the patient's
              performance first, then the AI interpretation, then the
              assignment/attempt detail. */}
          <div className="flex flex-col gap-6">
            <PatientPerformancePanel analytics={analytics} weeklyTrend={weeklyTrend} />

            <PatientInsightsPanel
              clinicianPatientId={link.id}
              patientId={link.patient_id}
              initialInsight={latestInsight}
              attemptCount={attempts.length}
            />

            <Card>
              <CardHeader>
                <CardTitle>Assignments</CardTitle>
              </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No activities assigned yet.
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y divide-border">
                      {assignments.map((a) => {
                        const overdue = isOverdue(a.due_date, a.status);
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{a.title}</p>
                              <p className={cn("text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                                {a.due_date ? `Due ${formatDate(a.due_date)}` : "No due date"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {overdue && (
                                <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
                                  <AlertTriangle className="size-3" /> Overdue
                                </Badge>
                              )}
                              <Badge variant={statusStyles[a.status] ?? "outline"}>
                                {a.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Completed attempts</CardTitle>
                </CardHeader>
                <CardContent>
                  <AttemptNotes
                    attempts={attempts}
                    titleByAssignment={titleByAssignment}
                    clinicianPatientId={link.id}
                  />
                </CardContent>
              </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages">
          {messagesTab ? (
            <Card className="flex h-[32rem] flex-col overflow-hidden p-0">
              {/* key: same reasoning as the other two MessageThread call
                  sites — guarantees a fresh instance on a conversation
                  change via React's own contract, independent of whatever
                  Next.js's routing layer does with this [patientId]
                  segment (see conversation-detail-pane.tsx's comment on
                  its own MessageThread key for the full reasoning). */}
              <MessageThread
                key={messagesTab.conversationId}
                conversationId={messagesTab.conversationId}
                currentUserId={user.id}
                otherParticipantName={name}
                initialMessages={messagesTab.initialMessages}
                initialCursor={messagesTab.initialCursor}
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Messaging will be available once {name} claims their invite code (
                <span className="font-mono font-medium text-foreground">{link.invite_code}</span>).
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
