import { requireProfile } from "@/lib/auth/session";
import { getMyAttempts, computeStreak } from "@/lib/data/patient";
import { getMyNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";
import { getUnreadCounts } from "@/lib/data/messages";
import { PatientSidebar } from "@/components/patient/sidebar";
import { PatientTopbar } from "@/components/patient/topbar";
import { MessagingRealtimeProvider } from "@/lib/realtime/messaging-provider";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, user } = await requireProfile("patient");
  const [attempts, notifications, unreadCount, unreadMessageCounts] = await Promise.all([
    getMyAttempts(supabase, user.id),
    getMyNotifications(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
    getUnreadCounts(supabase, user.id),
  ]);
  const streak = computeStreak(attempts.map((a) => a.completed_at));

  return (
    <MessagingRealtimeProvider userId={user.id}>
      <div className="flex min-h-screen bg-background">
        <PatientSidebar initialUnreadCounts={unreadMessageCounts} />
        <div className="flex min-h-screen flex-1 flex-col">
          <PatientTopbar
            fullName={profile.full_name}
            streak={streak}
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
