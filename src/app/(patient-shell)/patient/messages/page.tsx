import { requireProfile } from "@/lib/auth/session";
import { getMyActiveClinicians } from "@/lib/data/patient";
import { getConversation, getMessages } from "@/lib/data/messages";
import { startConversation } from "@/lib/actions/messages";
import { MessageThread } from "@/components/clinician/message-thread";
import { ConversationSelector } from "@/components/patient/conversation-selector";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatRelativeTime } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default async function PatientMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const { supabase, user } = await requireProfile("patient");
  const clinicians = await getMyActiveClinicians(supabase, user.id);

  if (clinicians.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <h1 className="sr-only">Messages</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <MessageSquare className="size-6" />
            </span>
            <p className="font-medium">No clinician connected yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Once you&apos;re linked to a clinician, you&apos;ll be able to message them here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { with: withParam } = await searchParams;
  const selected = clinicians.find((c) => c.id === withParam) ?? clinicians[0];
  const clinicianName = selected.profiles?.full_name ?? "your clinician";

  const { conversation } = await startConversation(selected.id);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col">
        <h1 className="sr-only">Messages</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <MessageSquare className="size-6" />
            </span>
            <p className="font-medium">Couldn&apos;t open this conversation</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Something went wrong loading messages with {clinicianName}. Try again shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [conversationDetail, page] = await Promise.all([
    getConversation(supabase, conversation.id),
    getMessages(supabase, conversation.id),
  ]);

  const clinicianLastReadAt = conversationDetail?.participants.find(
    (p) => p.userId === selected.clinician_id,
  )?.lastReadAt;

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="sr-only">Messages</h1>

      {clinicians.length > 1 && (
        <ConversationSelector
          clinicians={clinicians.map((c) => ({ id: c.id, name: c.profiles?.full_name ?? "Clinician" }))}
          selectedId={selected.id}
        />
      )}

      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback>{initials(clinicianName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{clinicianName}</p>
          <p className="text-xs text-muted-foreground">
            {clinicianLastReadAt
              ? `Active ${formatRelativeTime(clinicianLastReadAt)}`
              : "Hasn't opened this conversation yet"}
          </p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <MessageThread
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
