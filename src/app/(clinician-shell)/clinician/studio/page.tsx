import { requireProfile } from "@/lib/auth/session";
import { getTemplates } from "@/lib/data/clinician";
import { StudioEntryCards } from "@/components/clinician/studio-entry-cards";
import { TemplateCard } from "@/components/clinician/template-card";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutTemplate } from "lucide-react";

export default async function StudioPage() {
  const { supabase, user } = await requireProfile("clinician");
  const templates = await getTemplates(supabase, user.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-semibold">Template Studio</h2>
        <p className="text-sm text-muted-foreground">Start a new activity, or open one you&apos;re working on.</p>
      </div>

      <StudioEntryCards />

      <div>
        <h3 className="mb-3 text-lg font-semibold">
          Your templates
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({templates.length})
          </span>
        </h3>

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
