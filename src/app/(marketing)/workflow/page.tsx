import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";
import {
  FilePlus2,
  MonitorSmartphone,
  Compass as CompassIcon,
  IdCard,
  LayoutTemplate,
  Send,
  ClipboardCheck,
  BrainCircuit,
} from "lucide-react";

const authoringSteps = [
  {
    icon: FilePlus2,
    title: "1. Initialize",
    body: "Start from a blank canvas, an Interactive Shell with pre-built behavior, or a Printable Form.",
  },
  {
    icon: MonitorSmartphone,
    title: "2. Medium",
    body: "Choose Interactive (digital), Hybrid (integrated), or Print (static) — sets the canvas defaults.",
  },
  {
    icon: CompassIcon,
    title: "3. Foundation",
    body: "Build from a Blueprint (a proven starting structure) or go Direct Build from an empty node.",
  },
  {
    icon: IdCard,
    title: "4. Identity",
    body: "Name the activity, tag its domain and subdomain, so it's easy to find in your library later.",
  },
  {
    icon: LayoutTemplate,
    title: "5. Canvas",
    body: "The canvas opens — pre-filled from your blueprint, or blank for a fresh build. Author freely.",
  },
];

const loopSteps = [
  { icon: LayoutTemplate, title: "Author", body: "Build an activity in the canvas studio and publish it to your template library." },
  { icon: Send, title: "Assign", body: "Pick a patient, add instructions and a due date, and assign the template." },
  { icon: ClipboardCheck, title: "Complete", body: "The patient works through the activity in a focused player; responses are scored automatically." },
  { icon: BrainCircuit, title: "Monitor", body: "Review accuracy trends and ask the AI assistant for a progress summary before the next session." },
];

export default function WorkflowPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary">Workflow</Badge>
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight">From blank canvas to progress note</h1>
        <p className="mt-3 text-muted-foreground">
          Two workflows: authoring an activity, and the clinical loop it feeds.
        </p>
      </Reveal>

      <h2 className="mt-16 text-xl font-semibold">Authoring a template</h2>
      <StaggerGroup className="mt-6 grid gap-4 md:grid-cols-5">
        {authoringSteps.map((s) => (
          <StaggerItem key={s.title}>
            <Card className="h-full transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
              <CardContent className="pt-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGroup>
      <p className="mt-4 text-sm text-muted-foreground">
        Summary: <span className="font-medium text-foreground">Initialize → Medium → Foundation → Identity → Canvas.</span>{" "}
        Skip straight to Canvas any time with a blank Initialize.
      </p>

      <h2 className="mt-20 text-xl font-semibold">The clinical loop</h2>
      <StaggerGroup className="relative mt-6 grid gap-6 md:grid-cols-4">
        <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-border md:block" />
        {loopSteps.map((s, i) => (
          <StaggerItem key={s.title} className="relative flex flex-col items-center text-center">
            <span className="z-10 flex size-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-sm">
              <s.icon className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            {i < loopSteps.length - 1 && (
              <span className="mt-2 text-xs font-medium text-primary md:hidden">↓</span>
            )}
          </StaggerItem>
        ))}
      </StaggerGroup>
    </div>
  );
}
