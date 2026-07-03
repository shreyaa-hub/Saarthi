import { Badge } from "@/components/ui/badge";
import { HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";

const values = [
  {
    icon: HeartHandshake,
    title: "Built for the caseload, not the boardroom",
    body: "Every screen exists to make a clinician's week shorter and a patient's practice more engaging.",
  },
  {
    icon: ShieldCheck,
    title: "Data stays scoped",
    body: "Patients only ever see their own activities. Clinicians only ever see their own caseload. Enforced at the database.",
  },
  {
    icon: Sparkles,
    title: "AI as a second read, not a replacement",
    body: "The AI assistant drafts a summary from attempt data — clinical judgment stays with the clinician.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Reveal>
        <Badge variant="secondary">About</Badge>
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight">
          A therapy authoring studio, from the ground up
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Saarthi Coach — &ldquo;saarthi&rdquo; means guide or charioteer — started from a simple
          observation: clinicians build the same kinds of activities over and over in tools
          never designed for therapy work, and patients lose the thread between sessions. The
          Studio puts a canvas-based authoring tool, an assignment workflow, and progress
          monitoring in one place.
        </p>
      </Reveal>

      <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-3">
        {values.map((v) => (
          <StaggerItem key={v.title}>
            <div className="h-full rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <v.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </div>
  );
}
