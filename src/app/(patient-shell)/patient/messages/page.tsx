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
    // h-full doesn't work here: the shell (patient/layout.tsx) sizes <main>
    // through a min-h-screen chain, which is a floor, not a ceiling — it
    // lets everything grow to fit content instead of clamping to available
    // space (confirmed by measuring actual rendered heights: with h-full,
    // this panel grew past 3000px instead of stopping at the viewport).
    // The clinician's Messages tab never hits this because its Card has an
    // absolute fixed height (h-[32rem]) + overflow-hidden, an independent
    // ceiling that doesn't depend on the shell at all. This does the same
    // thing, scoped to just this page: a real, computed upper bound
    // (viewport minus the topbar and this route's own <main> padding, which
    // differs at md: p-4 vs p-6) instead of a percentage that has nothing
    // definite to resolve against. min-h-0 overrides the flex default of
    // min-height:auto, which independently also lets a flex item grow to
    // fit its content — both were needed together to get a container that
    // actually clamps instead of grows, so only MessageThread's own
    // internal message list scrolls, exactly like the clinician side.
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col gap-4 md:h-[calc(100vh-7rem)]">
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
        {/* key is load-bearing here specifically: switching clinicians via
            ConversationSelector changes only the `with` search param, not
            the path — the least certain case for whether Next.js remounts
            this subtree on its own (unlike a dynamic path segment change,
            already independently guaranteed to remount). Without this,
            switching clinicians risks leaving MessageThread's `messages`
            state (a one-time useState(initialMessages) initializer)
            showing the PREVIOUS clinician's conversation. key removes the
            ambiguity entirely via React's own reconciliation contract. */}
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
