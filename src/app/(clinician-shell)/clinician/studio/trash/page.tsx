import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { getTrashedTemplates } from "@/lib/data/clinician";
import { TrashGrid } from "@/components/clinician/trash-grid";
import { Card, CardContent } from "@/components/ui/card";

export default async function StudioTrashPage() {
  const { supabase, user } = await requireProfile("clinician");
  const templates = await getTrashedTemplates(supabase, user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/clinician/studio"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h2 className="font-display text-2xl font-semibold">Trash</h2>
          <p className="text-sm text-muted-foreground">
            Deleted templates stay here until restored or permanently removed.
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <Trash2 className="size-6" />
            </span>
            <p className="font-medium">Trash is empty</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Deleted templates from the Studio will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <TrashGrid templates={templates} />
      )}
    </div>
  );
}
