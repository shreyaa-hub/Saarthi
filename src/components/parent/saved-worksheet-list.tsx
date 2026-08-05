"use client";

import { useTransition } from "react";
import { Trash2, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeSavedWorksheet } from "@/lib/actions/parent";
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

export function SavedWorksheetList({ saved }: { saved: SavedWorksheet[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
              <Button variant="outline" size="sm" onClick={() => window.print()} className="flex-1">
                <Printer className="size-4" /> Print
              </Button>
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
    </div>
  );
}
