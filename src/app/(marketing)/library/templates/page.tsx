import { getOptionalClinician } from "@/lib/auth/session";
import { getPublicTemplates } from "@/lib/data/library";
import { LibraryTemplateGrid } from "@/components/marketing/library-template-grid";
import { Reveal } from "@/components/motion/reveal";

export default async function TemplateLibraryPage() {
  const { supabase, clinicianId } = await getOptionalClinician();
  const templates = await getPublicTemplates(supabase);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Public Template Library</h1>
        <p className="mt-3 text-muted-foreground">
          A searchable, community-shared library of templates published by clinicians across every domain.
        </p>
      </Reveal>

      <div className="mt-10">
        <LibraryTemplateGrid templates={templates} canImport={Boolean(clinicianId)} />
      </div>
    </div>
  );
}
