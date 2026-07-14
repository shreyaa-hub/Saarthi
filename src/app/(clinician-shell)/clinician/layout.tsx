import { requireProfile } from "@/lib/auth/session";
import { getMyNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";
import { ClinicianSidebar } from "@/components/clinician/sidebar";
import { ClinicianTopbar } from "@/components/clinician/topbar";

export default async function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, user } = await requireProfile("clinician");
  const [notifications, unreadCount] = await Promise.all([
    getMyNotifications(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
  ]);

  return (
    <div className="flex min-h-screen bg-background">
      <ClinicianSidebar />
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
  );
}
