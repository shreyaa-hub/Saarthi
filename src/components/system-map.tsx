import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  LayoutTemplate,
  Trash2,
  Wand2,
  Send,
  CalendarDays,
  TrendingUp,
  BookOpen,
  ImageIcon,
  Bell,
  Search,
  Moon,
  MessageSquare,
  Wallet,
  ScrollText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type MapEntry = {
  icon: typeof LayoutDashboard;
  label: string;
  href?: string;
  body: string;
};

type MapSection = {
  title: string;
  entries: MapEntry[];
};

const CLINICIAN_SECTIONS: MapSection[] = [
  {
    title: "Your practice",
    entries: [
      { icon: LayoutDashboard, href: "/clinician", label: "Dashboard", body: "Caseload and activity at a glance." },
      { icon: Users, href: "/clinician/caseload", label: "Caseload", body: "Invite and manage patients; open a patient's detail page for their assignments, attempts, and AI insights." },
      { icon: Send, href: "/clinician/assignments", label: "Assignments", body: "Every activity assigned across your whole caseload." },
      { icon: CalendarDays, href: "/clinician/schedule", label: "Scheduler", body: "Calendar view of upcoming and overdue assignment due dates." },
      { icon: Wallet, href: "/clinician/billing", label: "Billing", body: "Issue statements to the guardians of your patients and mark them paid. A record only — no payment is taken." },
    ],
  },
  {
    title: "Template Studio",
    entries: [
      { icon: LayoutTemplate, href: "/clinician/studio", label: "Template Studio", body: "Build canvas-based therapy activities — text, images, audio, and interactive elements." },
      { icon: Wand2, href: "/clinician/studio/worksheet-generator", label: "Worksheet Creator", body: "Build a printable worksheet on a canvas — text with bold/italic/underline, bullet and numbered lists, shapes, writing lines, page ruling, images, and as many pages as you need." },
      { icon: Trash2, href: "/clinician/studio/trash", label: "Trash", body: "Restore a deleted template, or remove it permanently." },
    ],
  },
  {
    title: "Global Library (shared across roles)",
    entries: [
      { icon: BookOpen, href: "/library/templates", label: "Global Library", body: "Everything clinicians and families have published. Preview any of it, then import a private copy into your own Studio \u2014 editing your copy never changes theirs." },
      { icon: BookOpen, href: "/library/worksheets", label: "Worksheet Library", body: "Same idea, filtered to printable worksheets." },
      { icon: ImageIcon, href: "/library/assets", label: "Asset Library", body: "Publish or reuse standalone images across the whole platform." },
    ],
  },
];

const PATIENT_SECTIONS: MapSection[] = [
  {
    title: "Your missions",
    entries: [
      { icon: LayoutDashboard, href: "/patient", label: "My Missions", body: "Activities your clinician has assigned you." },
      { icon: TrendingUp, href: "/patient/progress", label: "Progress", body: "Accuracy trends over time, plus any notes your clinician has left." },
    ],
  },
  {
    title: "Global Library (shared across roles)",
    entries: [
      { icon: BookOpen, href: "/library/templates", label: "Global Library", body: "Everything shared platform-wide. Preview anything, then try an activity and see how you scored. Practice you pick yourself is not added to your progress." },
      { icon: BookOpen, href: "/library/worksheets", label: "Worksheet Library", body: "Printable worksheets published by clinicians." },
      { icon: ImageIcon, href: "/library/assets", label: "Asset Library", body: "Images shared across the platform." },
    ],
  },
];

const PARENT_SECTIONS: MapSection[] = [
  {
    title: "Following your child",
    entries: [
      { icon: LayoutDashboard, href: "/parent", label: "Dashboard", body: "How your child is doing at a glance, and what's coming up." },
      { icon: Send, href: "/parent/missions", label: "Missions", body: "Every activity assigned to your child — by their clinician, and anything you send from the Creator Hub. Your child completes these in their own account, and their clinician can see the results." },
      { icon: TrendingUp, href: "/parent/progress", label: "Progress", body: "Accuracy over time plus any notes the clinician has left on an activity." },
      { icon: CalendarDays, href: "/parent/calendar", label: "Calendar", body: "Activity due dates laid out by month." },
      { icon: MessageSquare, href: "/parent/messages", label: "Messages", body: "Your own conversation with your child's clinician — separate from your child's." },
    ],
  },
  {
    title: "Home practice and admin",
    entries: [
      { icon: BookOpen, href: "/parent/creator-hub", label: "Creator Hub", body: "Build your own interactive activities and printable worksheets on the same canvas clinicians use, browse what others have published, and send any of it to your child. Yours are shared publicly by default unless you keep them private — either way you can still send them to your own child." },
      { icon: Wallet, href: "/parent/finances", label: "Finances", body: "Statements your clinic has issued. A record only — no payment is taken here." },
    ],
  },
  {
    title: "Switching between children",
    entries: [
      { icon: Users, label: "Child Selector", body: "Top bar — if you're linked to more than one child, switch which one every screen is showing. Your choice is remembered." },
      { icon: BookOpen, href: "/library/templates", label: "Global Library", body: "Everything clinicians and families have published. Preview any of it, then import a private copy into your Creator Hub \u2014 editing your copy never changes theirs." },
    ],
  },
];

const EVERYWHERE: MapEntry[] = [
  { icon: Bell, label: "Notification bell", body: "Top bar, right side — unread alerts for new assignments, completed activities, and clinician notes." },
  { icon: Search, label: "Command palette", body: "Press Cmd/Ctrl+K anywhere to jump to a page or run a quick action." },
  { icon: Moon, label: "Theme toggle", body: "Top bar — switch between light and dark, persisted across visits." },
];

// Placed with the top-bar tools rather than under a role's own section: the
// rules are one shared list, and only who may edit it differs by role.
const BLUEPRINT_RULES: Record<"clinician" | "patient" | "parent", MapEntry | null> = {
  clinician: {
    icon: ScrollText,
    label: "Blueprint Rules",
    body: "Top bar, left of the search box — the standards every clinician follows when building activities. Add your own; they apply team-wide. Platform defaults can't be removed.",
  },
  parent: {
    icon: ScrollText,
    label: "Blueprint Rules",
    body: "Top bar, left of the search box — the authoring standards set by the clinical team. These apply to worksheets you make too.",
  },
  patient: null,
};

export function SystemMap({ role }: { role: "clinician" | "patient" | "parent" }) {
  const sections =
    role === "clinician" ? CLINICIAN_SECTIONS : role === "parent" ? PARENT_SECTIONS : PATIENT_SECTIONS;
  const blueprintRules = BLUEPRINT_RULES[role];
  const everywhere = blueprintRules ? [blueprintRules, ...EVERYWHERE] : EVERYWHERE;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">System Map</h2>
        <p className="text-sm text-muted-foreground">What&apos;s where, in one place.</p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.entries.map((entry) => (
              <EntryCard key={entry.label} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Available everywhere
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {everywhere.map((entry) => (
            <EntryCard key={entry.label} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry }: { entry: MapEntry }) {
  const content = (
    <Card className={entry.href ? "h-full transition-all hover:border-primary/40 hover:shadow-md" : "h-full"}>
      <CardContent className="flex items-start gap-3 pt-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <entry.icon className="size-4" />
        </span>
        <div>
          <p className="font-medium">{entry.label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{entry.body}</p>
        </div>
      </CardContent>
    </Card>
  );

  return entry.href ? <Link href={entry.href}>{content}</Link> : content;
}
