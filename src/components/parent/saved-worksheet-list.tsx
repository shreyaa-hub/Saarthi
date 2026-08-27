"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, Printer, Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeSavedWorksheet } from "@/lib/actions/parent";
import { AssignToChildDialog } from "@/components/parent/assign-to-child-dialog";
import type { ParentChild } from "@/lib/data/parent";
import { formatDate } from "@/lib/utils";

export type SavedWorksheet = {
  id: string;
  created_at: string;
  templates: {
    id: string;
    title: string;
    domain: string;
    thumbnail_color: string | null;
  } | null;
};

export function SavedWorksheetList({
  saved,
  childList,
  selectedChildId,
}: {
  saved: SavedWorksheet[];
  childList: ParentChild[];
  selectedChildId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assigning, setAssigning] = useState<{ id: string; title: string } | null>(null);

  const remove = (id: string) => {
    startTransition(async () => {
      const { error } = await removeSavedWorksheet(id);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Removed");
      router.refresh();
    });
  };

  if (saved.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nothing saved yet. Browse the worksheets below and save the ones you want for home practice.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {saved.map((row) => (
        <Card key={row.id}>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div
              className="h-20 rounded-lg"
              style={{ backgroundColor: row.templates?.thumbnail_color ?? "#e8edf3" }}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.templates?.title}</p>
                <p className="text-xs text-muted-foreground">Saved {formatDate(row.created_at)}</p>
              </div>
              <Badge variant="outline">{row.templates?.domain}</Badge>
            </div>
            <div className="flex gap-2">
              {/* Opens the worksheet's own printable page rather than
                  calling window.print() here — this component is a grid of
                  cards on the dashboard, so printing in place produced a
                  sheet of card thumbnails instead of the worksheet. */}
              {row.templates && (
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/print/template/${row.templates.id}`}>
                    <Printer className="size-4" /> Print / PDF
                  </Link>
                </Button>
              )}
              {childList.length > 0 && row.templates && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssigning({ id: row.templates!.id, title: row.templates!.title })}
                  aria-label={`Send ${row.templates.title} to your child`}
                >
                  <Send className="size-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(row.id)}
                disabled={pending}
                aria-label={`Remove ${row.templates?.title ?? "worksheet"} from saved`}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {assigning && (
        <AssignToChildDialog
          templateId={assigning.id}
          templateTitle={assigning.title}
          childList={childList}
          defaultChildId={selectedChildId}
          open={assigning !== null}
          onOpenChange={(o) => !o && setAssigning(null)}
        />
      )}
    </div>
  );
}
