import { redirect } from "next/navigation";

// Worksheets used to be the only thing a parent could author, so they had
// their own route. Now that parents make activities too, one medium-aware
// editor covers both — this stays so older links and bookmarks still land.
export default async function ParentWorksheetEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  redirect(`/parent/studio/${templateId}`);
}
