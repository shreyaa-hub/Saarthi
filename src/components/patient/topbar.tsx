"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, TrendingUp, LogOut, Flame } from "lucide-react";
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
import { initials } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/patient", label: "My Missions", icon: LayoutDashboard },
  { href: "/patient/progress", label: "Progress", icon: TrendingUp },
];

export function PatientTopbar({ fullName, streak }: { fullName: string; streak: number }) {
  const pathname = usePathname();
  const current = links.find((l) => (l.href === "/patient" ? pathname === l.href : pathname.startsWith(l.href)));

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
        <h1 className="font-semibold">{current?.label ?? "My Missions"}</h1>
      </div>

      <div className="flex items-center gap-2">
        {streak > 0 && (
          <span className="mr-2 flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent">
            <Flame className="size-4" /> {streak} day{streak === 1 ? "" : "s"}
          </span>
        )}
        <CommandPalette role="patient" />
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
