import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { getClinicianInbox } from "@/lib/data/messages";
import { ConversationDetailPane } from "@/components/clinician/conversation-detail-pane";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

// Deliberately does NOT redirect to /clinician/messages/[id] for the most
// recently active row — a hard redirect would make the bare route
// unreachable as a "back to the list" target on mobile (tapping back would
// just bounce straight back to the same conversation). Instead this
// renders the same detail pane inline, at the same URL; MessagesSplitPane
// hides that inline detail on mobile (where the bare route's job is to
// show the list) and shows it on desktop (where there's room for both).
export default async function ClinicianMessagesPage() {
  const { supabase, user } = await requireProfile("clinician");
  const rows = await getClinicianInbox(supabase, user.id);

  if (rows.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <MessageSquare className="size-6" />
          </span>
          <p className="font-medium">No active patients yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Invite a patient from your caseload to start messaging.
          </p>
          <Button asChild>
            <Link href="/clinician/caseload">Go to caseload</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ConversationDetailPane
      supabase={supabase}
      currentUserId={user.id}
      threadKey={rows[0].threadKey}
    />
  );
}
