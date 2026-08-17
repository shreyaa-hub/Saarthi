"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  LayoutTemplate,
  Send,
  TrendingUp,
  Wand2,
  FilePlus2,
  UserPlus,
  LogOut,
  Moon,
  Sun,
  Search,
  Trash2,
  CalendarDays,
  BookOpen,
  Map,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { toggleTheme } from "@/lib/theme";
import { searchCommandPalette, type PaletteSearchResult } from "@/lib/actions/command-palette";

type StaticItem = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof LayoutDashboard;
  action: (router: ReturnType<typeof useRouter>) => void;
};

const CLINICIAN_ITEMS: StaticItem[] = [
  { id: "nav-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, action: (r) => r.push("/clinician") },
  { id: "nav-caseload", label: "Go to Caseload", icon: Users, action: (r) => r.push("/clinician/caseload") },
  { id: "nav-studio", label: "Go to Template Studio", icon: LayoutTemplate, action: (r) => r.push("/clinician/studio") },
  { id: "nav-assignments", label: "Go to Assignments", icon: Send, action: (r) => r.push("/clinician/assignments") },
  { id: "nav-schedule", label: "Go to Scheduler", icon: CalendarDays, action: (r) => r.push("/clinician/schedule") },
  { id: "nav-billing", label: "Go to Billing", icon: Wallet, action: (r) => r.push("/clinician/billing") },
  { id: "nav-trash", label: "Go to Trash", icon: Trash2, action: (r) => r.push("/clinician/studio/trash") },
  { id: "new-template", label: "New template", icon: FilePlus2, action: (r) => r.push("/clinician/studio/initialize?entry=blank") },
  { id: "new-worksheet", label: "Generate a worksheet", icon: Wand2, action: (r) => r.push("/clinician/studio/worksheet-generator") },
  { id: "invite-patient", label: "Invite a patient", icon: UserPlus, action: (r) => r.push("/clinician/caseload") },
  { id: "nav-library", label: "Go to Global Library", icon: BookOpen, action: (r) => r.push("/library/templates") },
  { id: "nav-map", label: "Go to System Map", icon: Map, action: (r) => r.push("/clinician/system-map") },
];

const PATIENT_ITEMS: StaticItem[] = [
  { id: "nav-missions", label: "Go to My Missions", icon: LayoutDashboard, action: (r) => r.push("/patient") },
  { id: "nav-progress", label: "Go to Progress", icon: TrendingUp, action: (r) => r.push("/patient/progress") },
  { id: "nav-library", label: "Go to Global Library", icon: BookOpen, action: (r) => r.push("/library/templates") },
  { id: "nav-map", label: "Go to System Map", icon: Map, action: (r) => r.push("/patient/system-map") },
];

const PARENT_ITEMS: StaticItem[] = [
  { id: "nav-parent-home", label: "Go to Dashboard", icon: LayoutDashboard, action: (r) => r.push("/parent") },
  { id: "nav-parent-missions", label: "Go to Missions", icon: Send, action: (r) => r.push("/parent/missions") },
  { id: "nav-parent-progress", label: "Go to Progress", icon: TrendingUp, action: (r) => r.push("/parent/progress") },
  { id: "nav-parent-calendar", label: "Go to Calendar", icon: CalendarDays, action: (r) => r.push("/parent/calendar") },
  { id: "nav-parent-messages", label: "Go to Messages", icon: MessageSquare, action: (r) => r.push("/parent/messages") },
  { id: "nav-parent-hub", label: "Go to Creator Hub", icon: BookOpen, action: (r) => r.push("/parent/creator-hub") },
  { id: "nav-parent-finances", label: "Go to Finances", icon: Wallet, action: (r) => r.push("/parent/finances") },
  { id: "nav-map", label: "Go to System Map", icon: Map, action: (r) => r.push("/parent/system-map") },
];

export function CommandPalette({ role }: { role: "clinician" | "patient" | "parent" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaletteSearchResult>({ templates: [], patients: [] });
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fetch happens in the timeout callback (async, not synchronous within the
  // effect body), so this satisfies the "no setState directly in an effect"
  // rule. An empty query intentionally does not fetch; effectiveResults
  // below hides any stale results instead of clearing them here.
  useEffect(() => {
    if (role !== "clinician" || !query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        // A failed search (network blip, misconfigured backend) should
        // leave the palette usable — static navigation still works — not
        // crash the whole shell via an uncaught rejection.
        try {
          const res = await searchCommandPalette(query);
          setResults(res);
        } catch (err) {
          console.error("Command palette search failed:", err);
        }
      });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, role]);

  const staticItems =
    role === "clinician" ? CLINICIAN_ITEMS : role === "parent" ? PARENT_ITEMS : PATIENT_ITEMS;

  const filteredStatic = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticItems;
    return staticItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [staticItems, query]);

  const effectiveResults = query.trim() ? results : { templates: [], patients: [] };

  const closePalette = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults({ templates: [], patients: [] });
    }
  };

  const go = (fn: (router: ReturnType<typeof useRouter>) => void) => {
    closePalette(false);
    fn(router);
  };

  const hasResults =
    filteredStatic.length > 0 || effectiveResults.templates.length > 0 || effectiveResults.patients.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex cursor-pointer"
      >
        <Search className="size-3.5" />
        Search
        <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted sm:hidden cursor-pointer"
      >
        <Search className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={closePalette}>
        <DialogContent
          showClose={false}
          className="top-24 max-w-lg -translate-y-0 gap-0 overflow-hidden p-0"
        >
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or jump to…"
              className="border-none px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {!hasResults && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches.</p>
            )}

            {filteredStatic.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Navigate
                </p>
                {filteredStatic.map((item) => (
                  <PaletteRow key={item.id} icon={item.icon} label={item.label} onClick={() => go(item.action)} />
                ))}
              </div>
            )}

            {effectiveResults.templates.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Templates
                </p>
                {effectiveResults.templates.map((t) => (
                  <PaletteRow
                    key={t.id}
                    icon={LayoutTemplate}
                    label={t.title}
                    onClick={() => go((r) => r.push(`/clinician/studio/${t.id}`))}
                  />
                ))}
              </div>
            )}

            {effectiveResults.patients.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Patients
                </p>
                {effectiveResults.patients.map((p) => (
                  <PaletteRow
                    key={p.id}
                    icon={Users}
                    label={p.name}
                    onClick={() => go((r) => r.push(`/clinician/caseload/${p.id}`))}
                  />
                ))}
              </div>
            )}

            <div>
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </p>
              <PaletteRow
                icon={Moon}
                altIcon={Sun}
                label="Toggle theme"
                onClick={() => {
                  toggleTheme();
                  closePalette(false);
                }}
              />
              <PaletteRow
                icon={LogOut}
                label="Sign out"
                onClick={() => {
                  closePalette(false);
                  startTransition(() => signOut());
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PaletteRow({
  icon: Icon,
  altIcon: AltIcon,
  label,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  altIcon?: typeof LayoutDashboard;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted cursor-pointer",
      )}
    >
      <Icon className="size-4 text-muted-foreground" />
      {label}
      {AltIcon && <AltIcon className="ml-auto size-3.5 text-muted-foreground/50" />}
    </button>
  );
}
