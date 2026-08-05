import { MessageSquare } from "lucide-react";
import { getParentContext } from "@/lib/parent/context";
import { getConversation, getMessages } from "@/lib/data/messages";
import { startParentConversation } from "@/lib/actions/messages";
import { MessageThread } from "@/components/clinician/message-thread";
import { LastActiveLabel } from "@/components/last-active-label";
import { NoChildState } from "@/components/parent/no-child-state";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">Messages</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <MessageSquare className="size-6" />
          </span>
          <p className="font-medium">{title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ParentMessagesPage() {
  const { supabase, user, child } = await getParentContext();

  if (!child) {
    return (
      <NoChildState
        title="Messages"
        description="Connect to your child to message the clinician treating them."
      />
    );
  }

  if (!child.clinicianPatientId || !child.clinicianId) {
    return (
      <EmptyState
        title="No clinician to message"
        body={`${child.name.split(" ")[0]} isn't currently on a clinician's caseload, so there's no one to start a conversation with yet.`}
      />
    );
  }

  const clinicianName = child.clinicianName ?? "your child's clinician";
  const { conversation } = await startParentConversation(child.id);

  if (!conversation) {
    return (
      <EmptyState
        title="Couldn't open this conversation"
        body={`Something went wrong loading messages with ${clinicianName}. Try again shortly.`}
      />
    );
  }

  const [conversationDetail, page] = await Promise.all([
    getConversation(supabase, conversation.id),
    getMessages(supabase, conversation.id),
  ]);

  const clinicianLastReadAt = conversationDetail?.participants.find(
    (p) => p.userId === child.clinicianId,
  )?.lastReadAt;

  return (
    // Same computed viewport ceiling as the patient Messages page — the shell
    // sizes <main> through a min-h-screen chain, which is a floor rather than
    // a ceiling, so h-full would let this grow instead of clamping. See that
    // file's comment for the full reasoning.
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col gap-4 md:h-[calc(100vh-7rem)]">
      <h1 className="sr-only">Messages</h1>

      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback>{initials(clinicianName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{clinicianName}</p>
          <p className="text-xs text-muted-foreground">
            {clinicianLastReadAt ? (
              <LastActiveLabel lastReadAt={clinicianLastReadAt} />
            ) : (
              "Hasn't opened this conversation yet"
            )}
          </p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        {/* key: switching child via the Child Selector changes this thread
            without changing the path, the same reconciliation hazard the
            patient page's clinician switcher has. */}
        <MessageThread
          key={conversation.id}
          conversationId={conversation.id}
          currentUserId={user.id}
          otherParticipantName={clinicianName}
          initialMessages={page.messages}
          initialCursor={page.nextCursor}
        />
      </Card>
    </div>
  );
}
