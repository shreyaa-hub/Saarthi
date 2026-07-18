import { requireProfile } from "@/lib/auth/session";
import { getMyNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";
import { getUnreadCounts } from "@/lib/data/messages";
import { ClinicianSidebar } from "@/components/clinician/sidebar";
import { ClinicianTopbar } from "@/components/clinician/topbar";
import { MessagingRealtimeProvider } from "@/lib/realtime/messaging-provider";

export default async function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, user } = await requireProfile("clinician");
  const [notifications, unreadCount, unreadMessageCounts] = await Promise.all([
    getMyNotifications(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
    getUnreadCounts(supabase, user.id),
  ]);

  return (
    <MessagingRealtimeProvider userId={user.id}>
      <div className="flex min-h-screen bg-background">
        <ClinicianSidebar initialUnreadCounts={unreadMessageCounts} />
        <div className="flex min-h-screen flex-1 flex-col">
          <ClinicianTopbar
            fullName={profile.full_name}
            headline={profile.headline}
            userId={user.id}
            notifications={notifications}
            unreadCount={unreadCount}
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </MessagingRealtimeProvider>
  );
}
