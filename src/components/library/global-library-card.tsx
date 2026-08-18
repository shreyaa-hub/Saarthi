import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// The Global Library is public and reachable without an account, which made
// it easy to miss once you were signed in — nothing on any dashboard pointed
// at it. This is that pointer, worded for whoever is looking, since the three
// roles do genuinely different things there.
const COPY: Record<
  "clinician" | "patient" | "parent",
  { body: string; cta: string }
> = {
  clinician: {
    body: "Browse every activity and worksheet clinicians and families have published. Preview any of them, then import a private copy you can edit freely — the original is never affected.",
    cta: "Browse the Global Library",
  },
  parent: {
    body: "Browse every activity and worksheet clinicians and families have published. Preview any of them, then import a private copy to adapt for your child — the original is never affected.",
    cta: "Browse the Global Library",
  },
  patient: {
    body: "Browse activities and worksheets shared by clinicians and families. Preview anything, then try it and see how you scored. Practice you pick yourself stays with you.",
    cta: "Explore the Global Library",
  },
};

export function GlobalLibraryCard({ role }: { role: "clinician" | "patient" | "parent" }) {
  const { body, cta } = COPY[role];

  return (
    <Card className="border-primary/25 bg-secondary/40">
      <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
          <BookOpen className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Global Library</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/library/templates">
            {cta} <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
