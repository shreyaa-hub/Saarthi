import { requireProfile } from "@/lib/auth/session";
import { getClinicianInbox } from "@/lib/data/messages";
import { ConversationList } from "@/components/clinician/conversation-list";
import { MessagesSplitPane } from "@/components/clinician/messages-split-pane";

// Fetches the inbox once here so the list renders as part of the
// persistent layout — switching between conversations (page.tsx vs
// [clinicianPatientId]/page.tsx) only re-renders the right-hand detail
// pane, not the list.
export default async function ClinicianMessagesLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireProfile("clinician");
  const rows = await getClinicianInbox(supabase, user.id);

  return (
    <MessagesSplitPane
      list={<ConversationList rows={rows} currentUserId={user.id} />}
      detail={children}
    />
  );
}
