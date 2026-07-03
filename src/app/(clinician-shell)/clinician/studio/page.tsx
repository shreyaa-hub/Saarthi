import { requireProfile } from "@/lib/auth/session";
import { getTemplates } from "@/lib/data/clinician";
import { NewTemplateDialog } from "@/components/clinician/new-template-dialog";
import { TemplateCard } from "@/components/clinician/template-card";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutTemplate } from "lucide-react";

export default async function StudioPage() {
  const { supabase, user } = await requireProfile("clinician");
  const templates = await getTemplates(supabase, user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Template Studio</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length === 1 ? "" : "s"} in your library.
          </p>
        </div>
        <NewTemplateDialog />
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <LayoutTemplate className="size-6" />
            </span>
            <p className="font-medium">Your canvas is waiting</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first template to start building interactive activities.
            </p>
            <NewTemplateDialog />
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
  );
}
