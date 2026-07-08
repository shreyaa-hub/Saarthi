import Link from "next/link";
import { Trash2 } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { getTemplates } from "@/lib/data/clinician";
import { StudioEntryCards } from "@/components/clinician/studio-entry-cards";
import { TemplateGrid } from "@/components/clinician/template-grid";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutTemplate } from "lucide-react";

export default async function StudioPage() {
  const { supabase, user } = await requireProfile("clinician");
  const templates = await getTemplates(supabase, user.id);

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <h2 className="font-display text-2xl font-semibold">Template Studio</h2>
        <p className="text-sm text-muted-foreground">Start a new activity, or open one you&apos;re working on.</p>
      </Reveal>

      <Reveal delay={0.08}>
        <StudioEntryCards />
      </Reveal>

      <Reveal delay={0.16}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Your templates
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({templates.length})
            </span>
          </h3>
          <Link
            href="/clinician/studio/trash"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" /> Trash
          </Link>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                <LayoutTemplate className="size-6" />
              </span>
              <p className="font-medium">Your canvas is waiting</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Use one of the options above to create your first template.
              </p>
            </CardContent>
          </Card>
        ) : (
          <TemplateGrid templates={templates} />
        )}
      </Reveal>
    </div>
  );
}
