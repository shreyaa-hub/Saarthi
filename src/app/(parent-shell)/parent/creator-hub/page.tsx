import { getParentContext } from "@/lib/parent/context";
import { getSavedWorksheets, getMyTemplates } from "@/lib/data/parent";
import { getPublicTemplates } from "@/lib/data/library";
import { WorksheetBrowser } from "@/components/parent/worksheet-browser";
import { SavedWorksheetList, type SavedWorksheet } from "@/components/parent/saved-worksheet-list";
import { MyTemplateList, type MyTemplate } from "@/components/parent/my-template-list";
import { CreateTemplateDialog } from "@/components/parent/create-template-dialog";
import { ClaimDraftBanner } from "@/components/canvas/claim-draft-banner";

export default async function ParentCreatorHubPage() {
  const { supabase, user, child, children: myChildren } = await getParentContext();

  const [mine, saved, templates] = await Promise.all([
    getMyTemplates(supabase, user.id),
    getSavedWorksheets(supabase, user.id),
    // No medium filter: parents can now publish activities as well as
    // worksheets, so restricting the browser to print would hide half of
    // what the library holds.
    getPublicTemplates(supabase),
  ]);

  // Split on medium rather than showing one undifferentiated grid: an
  // interactive activity and a printable page are used in completely
  // different ways, and the child does one on screen and the other on paper.
  const activities = (mine as MyTemplate[]).filter((t) => t.medium !== "print");
  const worksheets = (mine as MyTemplate[]).filter((t) => t.medium === "print");

  const savedTemplateIds = saved
    .map((row) => (row.templates as { id: string } | null)?.id)
    .filter((id): id is string => Boolean(id));

  const firstName = child ? ` for ${child.name.split(" ")[0]}` : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Creator Hub</h2>
          <p className="text-sm text-muted-foreground">
            Build your own activities and printable worksheets{firstName}, send them to your child,
            or save ones other people have shared.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateTemplateDialog defaultMedium="interactive" label="New activity" />
          <CreateTemplateDialog defaultMedium="print" label="New worksheet" variant="outline" />
        </div>
      </div>

      <ClaimDraftBanner />

      <div>
        <h3 className="mb-3 text-lg font-semibold">Your activities ({activities.length})</h3>
        <MyTemplateList
          templates={activities}
          childList={myChildren}
          selectedChildId={child?.childId ?? null}
          emptyMessage="You haven't made any activities yet. Create one to build something your child works through on screen."
        />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Your worksheets ({worksheets.length})</h3>
        <MyTemplateList
          templates={worksheets}
          childList={myChildren}
          selectedChildId={child?.childId ?? null}
          emptyMessage="You haven't made any worksheets yet. Create one to lay out a printable page for home practice."
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
