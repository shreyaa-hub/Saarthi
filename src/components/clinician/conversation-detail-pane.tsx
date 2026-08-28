import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getConversation, getMessages, parseGuardianThreadKey } from "@/lib/data/messages";
import { startConversation, startParentConversation } from "@/lib/actions/messages";
import { MessageThread } from "@/components/clinician/message-thread";
import { LastActiveLabel } from "@/components/last-active-label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
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
  threadKey,
}: {
  supabase: SupabaseClient<Database>;
  currentUserId: string;
  // Either a clinician_patients id (the child's own thread) or a prefixed
  // parent_children id (their guardian's). Both RPCs are idempotent
  // get-or-creates that do their own authorization.
  threadKey: string;
}) {
  const parentChildId = parseGuardianThreadKey(threadKey);
  const { conversation, error } = parentChildId
    ? await startParentConversation(parentChildId)
    : await startConversation(threadKey);

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

  // On a guardian thread the person on the other end is the parent, not the
  // patient — naming the header after the patient there would label the
  // thread with someone who isn't in it.
  const counterpart = parentChildId
    ? conversationDetail?.participants.find((p) => p.role === "parent")
    : conversationDetail?.participants.find((p) => p.role === "patient");
  const counterpartName = counterpart?.fullName ?? (parentChildId ? "Guardian" : "Patient");

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/clinician/messages" className="text-muted-foreground hover:text-foreground md:hidden">
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar className="size-9">
          <AvatarFallback>{initials(counterpartName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{counterpartName}</p>
          <p className="text-xs text-muted-foreground">
            {parentChildId && <span className="mr-1">Guardian ·</span>}
            {counterpart?.lastReadAt ? (
              <LastActiveLabel lastReadAt={counterpart.lastReadAt} />
            ) : (
              "Hasn't opened this conversation yet"
            )}
          </p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        {/* key forces a fresh MessageThread instance whenever the
            conversation changes, guaranteed by React's own reconciliation
            contract rather than relying on Next.js's routing layer to
            remount this subtree. This project doesn't currently enable
            cacheComponents (which would otherwise hide-not-unmount routes
            and preserve stale `messages` state across navigation), but
            this component shouldn't depend on that config staying off to
            stay correct. */}
        <MessageThread
          key={conversation.id}
          conversationId={conversation.id}
          currentUserId={currentUserId}
          otherParticipantName={counterpartName}
          initialMessages={page.messages}
          initialCursor={page.nextCursor}
        />
      </Card>
    </div>
  );
}
