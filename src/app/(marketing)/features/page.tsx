import {
  LayoutTemplate,
  Image as ImageIcon,
  Type,
  Volume2,
  ListChecks,
  MoveHorizontal,
  ListOrdered,
  MousePointerClick,
  Users,
  CalendarClock,
  LineChart,
  BrainCircuit,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const canvasElements = [
  { icon: Type, label: "Text", body: "Headlines, prompts, and instructions with full typography control." },
  { icon: ImageIcon, label: "Image", body: "Photos, illustrations, icons, and pictograms." },
  { icon: Volume2, label: "Audio", body: "Embed a clip for listening or modeling tasks." },
  { icon: ListChecks, label: "Multiple choice", body: "Single or multi-select questions with auto-scoring." },
  { icon: Type, label: "Fill in the blank", body: "Typed-answer prompts with case-sensitivity control." },
  { icon: MoveHorizontal, label: "Drag to match", body: "Pair items across two columns." },
  { icon: ListOrdered, label: "Sequencing", body: "Put steps or events in the correct order." },
  { icon: MousePointerClick, label: "Button", body: "Navigate between screens or submit an activity." },
];

const groups = [
  {
    icon: LayoutTemplate,
    title: "Authoring",
    items: [
      "Free-form canvas with drag, resize, rotate, and layering",
      "Start blank, from a blueprint, or duplicate an existing template",
      "Organize templates by domain, medium, and status",
    ],
  },
  {
    icon: Users,
    title: "Caseload",
    items: [
      "Invite-code based patient linking — no PHI required to invite",
      "Per-patient assignment history and notes",
      "Clear separation between draft templates and live assignments",
    ],
  },
  {
    icon: CalendarClock,
    title: "Assignment",
    items: [
      "Assign any published template with instructions and a due date",
      "Assignments snapshot the canvas, so later template edits are safe",
      "Status tracking: assigned → in progress → completed",
    ],
  },
  {
    icon: LineChart,
    title: "Monitoring",
    items: [
      "Accuracy and completion trends per patient",
      "Attempt-level detail: responses, score, duration",
      "Streaks to encourage between-session practice",
    ],
  },
  {
    icon: BrainCircuit,
    title: "AI assistant",
    items: [
      "Claude reviews recent attempts on demand",
      "Produces strengths, concerns, and next-session recommendations",
      "Clinician-only — never shown to the patient",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary">Features</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Everything to author, assign, and monitor
        </h1>
        <p className="mt-3 text-muted-foreground">
          A focused feature set for the clinician-to-patient authoring loop — built to grow.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.title}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <g.icon className="size-5" />
                </span>
                <h2 className="font-semibold">{g.title}</h2>
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                {g.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight">Canvas element palette</h2>
          <p className="mt-2 text-muted-foreground">
            The building blocks available in the Studio today.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canvasElements.map((el) => (
            <div key={el.label} className="rounded-xl border border-border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                <el.icon className="size-4" />
              </span>
              <p className="mt-3 text-sm font-semibold">{el.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{el.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
