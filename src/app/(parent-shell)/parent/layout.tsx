import { getMyNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";
import { getUnreadCounts } from "@/lib/data/messages";
import { ParentSidebar } from "@/components/parent/sidebar";
import { ParentTopbar } from "@/components/parent/topbar";
import { MessagingRealtimeProvider } from "@/lib/realtime/messaging-provider";
import { getParentContext } from "@/lib/parent/context";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, user, children: myChildren, child } = await getParentContext();

  const [notifications, unreadCount, unreadMessageCounts] = await Promise.all([
    getMyNotifications(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
    getUnreadCounts(supabase, user.id),
  ]);

  return (
    <MessagingRealtimeProvider userId={user.id}>
      <div className="flex min-h-screen bg-background">
        <ParentSidebar initialUnreadCounts={unreadMessageCounts} />
        <div className="flex min-h-screen flex-1 flex-col">
          <ParentTopbar
            fullName={profile.full_name}
            userId={user.id}
            notifications={notifications}
            unreadCount={unreadCount}
            childList={myChildren}
            selectedChildId={child?.childId ?? null}
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </MessagingRealtimeProvider>
  );
}
