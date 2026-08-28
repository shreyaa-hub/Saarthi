"use client";

import Link from "next/link";
import { useState } from "react";
import { Compass, Menu, X, ChevronDown, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homeForRole } from "@/lib/auth/roles";
import type { ProfileRole } from "@/lib/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const links = [
  { href: "/features", label: "Features" },
  { href: "/workflow", label: "Workflow" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const libraryLinks = [
  { href: "/library/templates", label: "Template Library" },
  { href: "/library/worksheets", label: "Worksheet Library" },
  { href: "/library/assets", label: "Asset Library" },
  { href: "/marketplace", label: "Marketplace" },
];

// The Global Library lives in this layout and is deliberately reachable
// without an account, so a signed-in user browsing it still gets this bar.
// `role` is resolved in the layout: without it the bar offered "Sign in" and
// "Get started" to somebody already signed in, and pointed at the guest
// Studio when they have the real one.
export function Navbar({ role }: { role: ProfileRole | null }) {
  const [open, setOpen] = useState(false);
  const dashboardHref = role ? homeForRole(role) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </span>
          Verbal Coach
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="group relative inline-flex min-h-11 items-center py-1 transition-colors hover:text-foreground">
              {l.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-h-11 items-center gap-1 transition-colors hover:text-foreground outline-none cursor-pointer">
              Resources <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {libraryLinks.map((l) => (
                <DropdownMenuItem key={l.href} asChild>
                  <Link href={l.href}>{l.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {dashboardHref ? (
            <Button asChild>
              <Link href={dashboardHref}>
                <LayoutDashboard className="size-4" /> Back to dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/try">Try the Studio</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="flex size-11 items-center justify-center rounded-md text-foreground md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border md:hidden transition-[max-height]",
          open ? "max-h-96" : "max-h-0 border-t-0",
        )}
      >
        <nav className="flex flex-col gap-1 p-4 text-sm font-medium">
          {[...links, ...libraryLinks].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex min-h-11 items-center rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 px-3">
            {dashboardHref ? (
              <Button asChild className="flex-1" onClick={() => setOpen(false)}>
                <Link href={dashboardHref}>
                  <LayoutDashboard className="size-4" /> Back to dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/try">Try the Studio</Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
