"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Compass,
  LayoutDashboard,
  Users,
  LayoutTemplate,
  Send,
  CalendarDays,
  MessageSquare,
  LogOut,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { conversationUnreadIncremented, conversationUnreadCleared } from "@/lib/realtime/messaging-dispatcher";

const links = [
  { href: "/clinician", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/clinician/caseload", label: "Caseload", icon: Users },
  { href: "/clinician/messages", label: "Messages", icon: MessageSquare },
  { href: "/clinician/studio", label: "Template Studio", icon: LayoutTemplate },
  { href: "/clinician/assignments", label: "Assignments", icon: Send },
  { href: "/clinician/schedule", label: "Scheduler", icon: CalendarDays },
  { href: "/clinician/billing", label: "Billing", icon: Wallet },
];

export function ClinicianSidebar({
  initialUnreadCounts = {},
}: {
  initialUnreadCounts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const [unreadCounts, setUnreadCounts] = useState(initialUnreadCounts);
  const [prevInitialUnreadCounts, setPrevInitialUnreadCounts] = useState(initialUnreadCounts);

  // Same reconciliation-to-server-truth pattern as ConversationList and
  // NotificationBell — a fresh initialUnreadCounts prop arrives on every
  // one of this user's own actions that call revalidatePath (most
  // message/notification actions do), and always fully replaces
  // provisional client state rather than merging with it.
  if (initialUnreadCounts !== prevInitialUnreadCounts) {
    setPrevInitialUnreadCounts(initialUnreadCounts);
    setUnreadCounts(initialUnreadCounts);
  }

  // Entirely event-driven — a message from someone else
  // increments its conversation's count (unless that conversation is
  // currently open, suppressed upstream in MessagingRealtimeProvider, so
  // it never arrives here at all); opening a conversation zeroes it.
  // Deliberately has no dependency on NotificationBell — nothing here
  // reads or reacts to its open/closed state or its own notifications/
  // unreadCount, so opening or closing the bell cannot affect this badge.
  useEffect(() => {
    const unsubscribeIncrement = conversationUnreadIncremented.subscribe((conversationId) => {
      setUnreadCounts((prev) => ({ ...prev, [conversationId]: (prev[conversationId] ?? 0) + 1 }));
    });

    const unsubscribeCleared = conversationUnreadCleared.subscribe((conversationId) => {
      setUnreadCounts((prev) => {
        if ((prev[conversationId] ?? 0) === 0) return prev;
        return { ...prev, [conversationId]: 0 };
      });
    });

    return () => {
      unsubscribeIncrement();
      unsubscribeCleared();
    };
  }, []);

  const unreadMessageCount = useMemo(
    () => Object.values(unreadCounts).reduce((sum, n) => sum + n, 0),
    [unreadCounts],
  );

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-5 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Compass className="size-4" />
        </span>
        Verbal Coach
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "text-white" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              {active && (
                <motion.span
                  layoutId="clinician-sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                />
              )}
              <l.icon className="relative z-10 size-4" />
              <span className="relative z-10">{l.label}</span>
              {l.href === "/clinician/messages" && unreadMessageCount > 0 && (
                <Badge variant="accent" className="relative z-10 ml-auto px-1.5 py-0">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  <span className="sr-only"> unread</span>
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-white cursor-pointer"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
