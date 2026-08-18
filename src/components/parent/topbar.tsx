"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Map, LogOut } from "lucide-react";
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
import { BlueprintRulesDialog } from "@/components/clinician/blueprint-rules-dialog";
import { ChildSelector } from "@/components/parent/child-selector";
import { PARENT_LINKS } from "@/components/parent/sidebar";
import { initials } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import type { Database } from "@/lib/types/database";
import type { ParentChild } from "@/lib/data/parent";
import type { BlueprintRule } from "@/lib/data/blueprint-rules";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export function ParentTopbar({
  fullName,
  userId,
  notifications,
  unreadCount,
  childList,
  selectedChildId,
  blueprintRules,
  blueprintRulesFailed,
}: {
  fullName: string;
  userId: string;
  notifications: NotificationRow[];
  unreadCount: number;
  childList: ParentChild[];
  selectedChildId: string | null;
  blueprintRules: BlueprintRule[];
  blueprintRulesFailed: boolean;
}) {
  const pathname = usePathname();
  const current = PARENT_LINKS.find((l) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href),
  );
  const selected = childList.find((c) => c.childId === selectedChildId);

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-9 items-center justify-center rounded-md hover:bg-muted md:hidden cursor-pointer">
            <Menu className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PARENT_LINKS.map((l) => (
              <DropdownMenuItem key={l.href} asChild>
                <Link href={l.href}>
                  <l.icon className="size-4" /> {l.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <h1 className="shrink-0 font-semibold">{current?.label ?? "Dashboard"}</h1>

        {/* The Child Selector only earns its dropdown when there is a real
            choice to make; one child renders as a plain label. */}
        {selectedChildId && childList.length > 1 && (
          <div className="hidden sm:block">
            <ChildSelector childList={childList} selectedChildId={selectedChildId} />
          </div>
        )}
        {selectedChildId && childList.length === 1 && (
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            · {selected?.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Read-only here: parents author worksheets, so they need to see the
            standards, but setting them is the clinical team's call. */}
        <BlueprintRulesDialog
          rules={blueprintRules}
          canEdit={false}
          loadFailed={blueprintRulesFailed}
        />
        <CommandPalette role="parent" />
        <NotificationBell userId={userId} initialNotifications={notifications} initialUnreadCount={unreadCount} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none cursor-pointer">
            <Avatar>
              <AvatarFallback>{initials(fullName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{fullName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/parent/system-map">
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
