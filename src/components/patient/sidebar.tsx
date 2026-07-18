"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, LayoutDashboard, MessageSquare, TrendingUp, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { conversationUnreadIncremented, conversationUnreadCleared } from "@/lib/realtime/messaging-dispatcher";

const links = [
  { href: "/patient", label: "My Missions", icon: LayoutDashboard, exact: true },
  { href: "/patient/messages", label: "Messages", icon: MessageSquare },
  { href: "/patient/progress", label: "Progress", icon: TrendingUp },
];

export function PatientSidebar({
  initialUnreadCounts = {},
}: {
  initialUnreadCounts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const [unreadCounts, setUnreadCounts] = useState(initialUnreadCounts);
  const [prevInitialUnreadCounts, setPrevInitialUnreadCounts] = useState(initialUnreadCounts);

  // Same reconciliation-to-server-truth pattern as ConversationList
  // (Phase 3) and NotificationBell (Phase 4's fix) — see
  // ClinicianSidebar's identical comment for the full reasoning.
  if (initialUnreadCounts !== prevInitialUnreadCounts) {
    setPrevInitialUnreadCounts(initialUnreadCounts);
    setUnreadCounts(initialUnreadCounts);
  }

  // Step 5, Phase 5: entirely event-driven, same rules as ClinicianSidebar
  // — kept as two separate, identical implementations (clinician/patient
  // sidebars were already two separate components before Step 5) rather
  // than introducing a new shared component now, matching the scope of
  // this change.
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
        Saarthi Coach
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
                  layoutId="patient-sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                />
              )}
              <l.icon className="relative z-10 size-4" />
              <span className="relative z-10">{l.label}</span>
              {l.href === "/patient/messages" && unreadMessageCount > 0 && (
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
