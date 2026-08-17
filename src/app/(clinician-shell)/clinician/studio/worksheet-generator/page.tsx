import { requireProfile } from "@/lib/auth/session";
import { WorksheetCreatorForm } from "@/components/clinician/worksheet-creator-form";

export default async function WorksheetCreatorPage() {
  await requireProfile("clinician");
  return <WorksheetCreatorForm />;
}
