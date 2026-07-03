import Link from "next/link";
import {
  LayoutTemplate,
  Send,
  BrainCircuit,
  MousePointerClick,
  Puzzle,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroPreview } from "@/components/marketing/hero-preview";

const features = [
  {
    icon: LayoutTemplate,
    title: "Canvas authoring studio",
    body: "Drag, drop, resize, and layer text, images, audio, and interactive elements onto a free-form canvas — no code required.",
  },
  {
    icon: Puzzle,
    title: "Interactive activity elements",
    body: "Multiple choice, fill-in-the-blank, drag-to-match, and sequencing elements, each auto-scored when a patient completes them.",
  },
  {
    icon: Send,
    title: "One-click assignment",
    body: "Assign any template to a patient with a due date and instructions. Templates stay reusable; each assignment gets its own frozen copy.",
  },
  {
    icon: MousePointerClick,
    title: "Patient activity player",
    body: "Patients get a focused, distraction-free player for every assigned activity, with streaks to keep them motivated between sessions.",
  },
  {
    icon: BarChart3,
    title: "Progress monitoring",
    body: "Accuracy trends, completion rates, and streaks roll up automatically on every patient's chart.",
  },
  {
    icon: BrainCircuit,
    title: "AI progress insights",
    body: "Claude reviews recent attempts and drafts a clinical summary — strengths, concerns, and next-session recommendations.",
  },
];

const steps = [
  { label: "Initialize", body: "Start blank or from a proven blueprint." },
  { label: "Medium", body: "Interactive, hybrid, or print." },
  { label: "Foundation", body: "Pick a domain and build from there." },
  { label: "Canvas", body: "Author freely, then publish to your library." },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_var(--secondary),_transparent_60%)]" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-20 text-center md:pt-28">
          <Badge variant="secondary" className="mb-5">
            Therapy Authoring Studio
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-6xl">
            Build therapy activities on a canvas. Assign them in a click.
            Watch progress with AI.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
            Saarthi Coach gives clinicians a drag-and-drop studio for authoring interactive
            activities, a simple way to assign them to patients, and an AI assistant that
            turns attempt data into clinical insight.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Start building free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/workflow">See how it works</Link>
            </Button>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{s.label}</p>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything the caseload loop needs</h2>
          <p className="mt-3 text-muted-foreground">
            From first draft to progress note, one workspace for clinicians and their patients.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="text-2xl font-bold">Ready to build your first activity?</h2>
            <p className="mt-2 text-primary-foreground/80">
              Create a free clinician account and open the canvas in under a minute.
            </p>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/sign-up">
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
