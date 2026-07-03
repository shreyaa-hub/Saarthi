import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Sparkles className="size-7" />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This area is on the roadmap. Today, the Studio focuses on canvas-based template
        authoring, assignment, and progress monitoring.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/sign-up">Try the Studio</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
