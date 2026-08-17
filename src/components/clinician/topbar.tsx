"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, Users, LayoutTemplate, Send, CalendarDays, MessageSquare, Map, LogOut, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { NotificationBell } from "@/components/notification-bell";
import { initials } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import type { Database } from "@/lib/types/database";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const links = [
  { href: "/clinician", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clinician/caseload", label: "Caseload", icon: Users },
  { href: "/clinician/messages", label: "Messages", icon: MessageSquare },
  { href: "/clinician/studio", label: "Template Studio", icon: LayoutTemplate },
  { href: "/clinician/assignments", label: "Assignments", icon: Send },
  { href: "/clinician/schedule", label: "Scheduler", icon: CalendarDays },
  { href: "/clinician/billing", label: "Billing", icon: Wallet },
];

export function ClinicianTopbar({
  fullName,
  headline,
  userId,
  notifications,
  unreadCount,
}: {
  fullName: string;
  headline?: string | null;
  userId: string;
  notifications: NotificationRow[];
  unreadCount: number;
}) {
  const pathname = usePathname();
  const current = links.find((l) =>
    l.href === "/clinician" ? pathname === l.href : pathname.startsWith(l.href),
  );

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-9 items-center justify-center rounded-md hover:bg-muted md:hidden cursor-pointer">
            <Menu className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {links.map((l) => (
              <DropdownMenuItem key={l.href} asChild>
                <Link href={l.href}>
                  <l.icon className="size-4" /> {l.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <h1 className="font-semibold">{current?.label ?? "Dashboard"}</h1>
      </div>

      <div className="flex items-center gap-2">
        <CommandPalette role="clinician" />
        <NotificationBell userId={userId} initialNotifications={notifications} initialUnreadCount={unreadCount} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none cursor-pointer">
            <Avatar>
              <AvatarFallback>{initials(fullName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="font-medium">{fullName}</p>
              {headline && <p className="text-xs font-normal text-muted-foreground">{headline}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/clinician/system-map">
                <Map className="size-4" /> System map
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={signOut} className="w-full">
                <button type="submit" className="flex w-full items-center gap-2 cursor-pointer">
                  <LogOut className="size-4" /> Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
