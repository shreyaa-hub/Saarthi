"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, Users, LayoutTemplate, Send, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/clinician", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clinician/caseload", label: "Caseload", icon: Users },
  { href: "/clinician/studio", label: "Template Studio", icon: LayoutTemplate },
  { href: "/clinician/assignments", label: "Assignments", icon: Send },
];

export function ClinicianTopbar({
  fullName,
  headline,
}: {
  fullName: string;
  headline?: string | null;
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
            <form action={signOut} className="w-full">
              <button type="submit" className="flex w-full items-center gap-2 cursor-pointer">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
