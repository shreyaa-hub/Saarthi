import { getOptionalViewer } from "@/lib/auth/session";
import { getPublicTemplates } from "@/lib/data/library";
import { starterLibraryRows } from "@/lib/canvas/starters";
import { LibraryTemplateGrid } from "@/components/marketing/library-template-grid";
import { Reveal } from "@/components/motion/reveal";

export default async function TemplateLibraryPage() {
  const { supabase, role } = await getOptionalViewer();
  const shared = await getPublicTemplates(supabase);
  // Starters first, so the library is never empty and a newcomer always has a
  // worked example to open. They are built in rather than shared by anybody,
  // which is why they do not come from the query.
  const templates = [
    ...starterLibraryRows("interactive"),
    ...starterLibraryRows("hybrid"),
    ...shared,
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Global Library</h1>
        <p className="mt-3 text-muted-foreground">
          Ready-made starter activities to open and change, plus everything clinicians and families have chosen to share. Preview any of them before you use them.
        </p>
      </Reveal>

      <div className="mt-10">
        <LibraryTemplateGrid templates={templates} role={role} />
      </div>
    </div>
  );
}
