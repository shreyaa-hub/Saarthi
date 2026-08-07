import { getParentContext } from "@/lib/parent/context";
import { getSavedWorksheets, getMyWorksheets } from "@/lib/data/parent";
import { getPublicTemplates } from "@/lib/data/library";
import { WorksheetBrowser } from "@/components/parent/worksheet-browser";
import { SavedWorksheetList, type SavedWorksheet } from "@/components/parent/saved-worksheet-list";
import { MyWorksheetList, type MyWorksheet } from "@/components/parent/my-worksheet-list";
import { CreateWorksheetDialog } from "@/components/parent/create-worksheet-dialog";

export default async function ParentCreatorHubPage() {
  const { supabase, user, child, children: myChildren } = await getParentContext();

  const [mine, saved, templates] = await Promise.all([
    getMyWorksheets(supabase, user.id),
    getSavedWorksheets(supabase, user.id),
    getPublicTemplates(supabase, { medium: "print" }),
  ]);

  const savedTemplateIds = saved
    .map((row) => (row.templates as { id: string } | null)?.id)
    .filter((id): id is string => Boolean(id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Creator Hub</h2>
          <p className="text-sm text-muted-foreground">
            Make your own printable worksheets
            {child ? ` for ${child.name.split(" ")[0]}` : ""}, or save ones other people have shared.
          </p>
        </div>
        <CreateWorksheetDialog />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Your worksheets ({mine.length})</h3>
        <MyWorksheetList
          worksheets={mine as unknown as MyWorksheet[]}
          childList={myChildren}
          selectedChildId={child?.childId ?? null}
        />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Saved for home practice ({saved.length})</h3>
        <SavedWorksheetList
          saved={saved as unknown as SavedWorksheet[]}
          childList={myChildren}
          selectedChildId={child?.childId ?? null}
        />
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
