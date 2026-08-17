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
      { icon: BookOpen, href: "/library/templates", label: "Template Library", body: "Browse templates other clinicians have published; import a copy into your own Studio." },
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
      { icon: BookOpen, href: "/library/templates", label: "Template Library", body: "Browse what clinicians are publishing platform-wide." },
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
      { icon: Send, href: "/parent/missions", label: "Missions", body: "Every activity assigned to your child — by their clinician, and anything you send from the Creator Hub. Your child completes these in their own account." },
      { icon: TrendingUp, href: "/parent/progress", label: "Progress", body: "Accuracy over time plus any notes the clinician has left on an activity." },
      { icon: CalendarDays, href: "/parent/calendar", label: "Calendar", body: "Activity due dates laid out by month." },
      { icon: MessageSquare, href: "/parent/messages", label: "Messages", body: "Your own conversation with your child's clinician — separate from your child's." },
    ],
  },
  {
    title: "Home practice and admin",
    entries: [
      { icon: BookOpen, href: "/parent/creator-hub", label: "Creator Hub", body: "Make your own printable worksheets, browse ones clinicians have published, and send either to your child. Yours are shared publicly by default unless you keep them private." },
      { icon: Wallet, href: "/parent/finances", label: "Finances", body: "Statements your clinic has issued. A record only — no payment is taken here." },
    ],
  },
  {
    title: "Switching between children",
    entries: [
      { icon: Users, label: "Child Selector", body: "Top bar — if you're linked to more than one child, switch which one every screen is showing. Your choice is remembered." },
      { icon: BookOpen, href: "/library/templates", label: "Global Library", body: "Everything clinicians have published platform-wide." },
    ],
  },
];

const EVERYWHERE: MapEntry[] = [
  { icon: Bell, label: "Notification bell", body: "Top bar, right side — unread alerts for new assignments, completed activities, and clinician notes." },
  { icon: Search, label: "Command palette", body: "Press Cmd/Ctrl+K anywhere to jump to a page or run a quick action." },
  { icon: Moon, label: "Theme toggle", body: "Top bar — switch between light and dark, persisted across visits." },
];

export function SystemMap({ role }: { role: "clinician" | "patient" | "parent" }) {
  const sections =
    role === "clinician" ? CLINICIAN_SECTIONS : role === "parent" ? PARENT_SECTIONS : PATIENT_SECTIONS;

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
          {EVERYWHERE.map((entry) => (
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
