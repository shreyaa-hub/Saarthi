import { getParentContext } from "@/lib/parent/context";
import { getSavedWorksheets } from "@/lib/data/parent";
import { getPublicTemplates } from "@/lib/data/library";
import { WorksheetBrowser } from "@/components/parent/worksheet-browser";
import { SavedWorksheetList, type SavedWorksheet } from "@/components/parent/saved-worksheet-list";

// Scope note: "Creator Hub" in the sitemap is undefined for a parent, and
// parents are not clinicians — they should not be authoring therapy content
// for their own child unsupervised. This implements it as a home-practice
// shortlist over the printable material clinicians have already published to
// the Global Library: browse, save, print. Nothing here creates or edits a
// template.
export default async function ParentCreatorHubPage() {
  const { supabase, user, child } = await getParentContext();

  const [saved, templates] = await Promise.all([
    getSavedWorksheets(supabase, user.id),
    getPublicTemplates(supabase, { medium: "print" }),
  ]);

  const savedTemplateIds = saved
    .map((row) => (row.templates as { id: string } | null)?.id)
    .filter((id): id is string => Boolean(id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Creator Hub</h2>
        <p className="text-sm text-muted-foreground">
          Printable worksheets clinicians have shared publicly. Save the ones you want for home practice
          {child ? ` with ${child.name.split(" ")[0]}` : ""}.
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Saved for home practice ({saved.length})</h3>
        <SavedWorksheetList saved={saved as unknown as SavedWorksheet[]} />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Browse the library</h3>
        <WorksheetBrowser
          templates={templates}
          savedTemplateIds={savedTemplateIds}
          childId={child?.childId ?? null}
        />
      </div>
    </div>
  );
}
