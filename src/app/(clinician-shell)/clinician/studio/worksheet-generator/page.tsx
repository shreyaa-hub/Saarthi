import { requireProfile } from "@/lib/auth/session";
import { WorksheetGeneratorForm } from "@/components/clinician/worksheet-generator-form";

export default async function WorksheetGeneratorPage() {
  await requireProfile("clinician");
  return <WorksheetGeneratorForm />;
}
