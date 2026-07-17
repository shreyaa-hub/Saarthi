import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getConversation, getMessages } from "@/lib/data/messages";
import { startConversation } from "@/lib/actions/messages";
import { MessageThread } from "@/components/clinician/message-thread";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatRelativeTime } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Shared by both /clinician/messages (auto-opens the most recent row
// inline, without redirecting — see MessagesSplitPane for why) and
// /clinician/messages/[clinicianPatientId] (a specific row), so the
// get-or-create + render logic isn't duplicated between them.
// start_conversation() is unconditional and idempotent, exactly like the
// patient side and the Patient Detail Messages tab — this is the third
// entry point reusing the same get-or-create flow, none of which need to
// know or care whether a conversation already existed.
export async function ConversationDetailPane({
  supabase,
  currentUserId,
  clinicianPatientId,
}: {
  supabase: SupabaseClient<Database>;
  currentUserId: string;
  clinicianPatientId: string;
}) {
  const { conversation, error } = await startConversation(clinicianPatientId);

  if (!conversation) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium">Couldn&apos;t open this conversation</p>
          <p className="max-w-sm text-sm text-muted-foreground">{error ?? "Something went wrong. Try again shortly."}</p>
        </CardContent>
      </Card>
    );
  }

  const [conversationDetail, page] = await Promise.all([
    getConversation(supabase, conversation.id),
    getMessages(supabase, conversation.id),
  ]);

  const patientParticipant = conversationDetail?.participants.find((p) => p.role === "patient");
  const patientName = patientParticipant?.fullName ?? "Patient";

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/clinician/messages" className="text-muted-foreground hover:text-foreground md:hidden">
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar className="size-9">
          <AvatarFallback>{initials(patientName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{patientName}</p>
          <p className="text-xs text-muted-foreground">
            {patientParticipant?.lastReadAt
              ? `Active ${formatRelativeTime(patientParticipant.lastReadAt)}`
              : "Hasn't opened this conversation yet"}
          </p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <MessageThread
          conversationId={conversation.id}
          currentUserId={currentUserId}
          otherParticipantName={patientName}
          initialMessages={page.messages}
          initialCursor={page.nextCursor}
        />
      </Card>
    </div>
  );
}
