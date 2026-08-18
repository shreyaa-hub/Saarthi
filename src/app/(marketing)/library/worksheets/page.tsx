import { getOptionalViewer } from "@/lib/auth/session";
import { getPublicTemplates } from "@/lib/data/library";
import { LibraryTemplateGrid } from "@/components/marketing/library-template-grid";
import { Reveal } from "@/components/motion/reveal";

export default async function WorksheetLibraryPage() {
  const { supabase, role } = await getOptionalViewer();
  const worksheets = await getPublicTemplates(supabase, { medium: "print" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Worksheet Library</h1>
        <p className="mt-3 text-muted-foreground">
          The printable half of the Global Library, published by clinicians and families alike.
        </p>
      </Reveal>

      <div className="mt-10">
        <LibraryTemplateGrid templates={worksheets} role={role} />
      </div>
    </div>
  );
}
