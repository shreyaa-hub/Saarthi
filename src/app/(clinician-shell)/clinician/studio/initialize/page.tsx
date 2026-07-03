import { requireProfile } from "@/lib/auth/session";
import { getTemplates } from "@/lib/data/clinician";
import { InitializeWizard } from "@/components/clinician/initialize-wizard";

const VALID_ENTRIES = ["blank", "interactive-shell", "printable-forms"] as const;

export default async function InitializeTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>;
}) {
  const { entry: rawEntry } = await searchParams;
  const entry = VALID_ENTRIES.includes(rawEntry as (typeof VALID_ENTRIES)[number])
    ? (rawEntry as (typeof VALID_ENTRIES)[number])
    : "blank";

  const { supabase, user } = await requireProfile("clinician");
  const templates = await getTemplates(supabase, user.id);

  return (
    <InitializeWizard
      entry={entry}
      myTemplates={templates.map((t) => ({
        id: t.id,
        title: t.title,
        domain: t.domain,
        medium: t.medium,
        updated_at: t.updated_at,
      }))}
    />
  );
}
