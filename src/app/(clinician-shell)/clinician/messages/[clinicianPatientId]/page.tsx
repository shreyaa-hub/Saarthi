import { requireProfile } from "@/lib/auth/session";
import { ConversationDetailPane } from "@/components/clinician/conversation-detail-pane";

export default async function ClinicianMessageThreadPage({
  params,
}: {
  params: Promise<{ clinicianPatientId: string }>;
}) {
  const { clinicianPatientId } = await params;
  const { supabase, user } = await requireProfile("clinician");

  return (
    <ConversationDetailPane
      supabase={supabase}
      currentUserId={user.id}
      threadKey={clinicianPatientId}
    />
  );
}
