"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe2, Lock, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setParentWorksheetVisibility, deleteParentWorksheet } from "@/lib/actions/parent";
import { formatDate } from "@/lib/utils";

export type MyWorksheet = {
  id: string;
  title: string;
  domain: string;
  is_public: boolean;
  thumbnail_color: string | null;
  updated_at: string;
};

export function MyWorksheetList({ worksheets }: { worksheets: MyWorksheet[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggleVisibility = (id: string, next: boolean) => {
    startTransition(async () => {
      const { error } = await setParentWorksheetVisibility(id, next);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(next ? "Shared to the public library" : "Set to private");
      router.refresh();
    });
  };

  const remove = (id: string, title: string) => {
    startTransition(async () => {
      const { error } = await deleteParentWorksheet(id);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`Deleted “${title}”`);
      router.refresh();
    });
  };

  if (worksheets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          You haven&apos;t made any worksheets yet. Create one to lay out a printable page for
          home practice.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {worksheets.map((w) => (
        <Card key={w.id}>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div
              className="h-20 rounded-lg"
              style={{ backgroundColor: w.thumbnail_color ?? "#e8edf3" }}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{w.title}</p>
                <p className="text-xs text-muted-foreground">Edited {formatDate(w.updated_at)}</p>
              </div>
              <Badge variant="outline">{w.domain}</Badge>
            </div>

            <Badge variant={w.is_public ? "success" : "secondary"} className="w-fit gap-1">
              {w.is_public ? <Globe2 className="size-3" /> : <Lock className="size-3" />}
              {w.is_public ? "Public" : "Private"}
            </Badge>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link href={`/parent/worksheets/${w.id}`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => toggleVisibility(w.id, !w.is_public)}
                aria-label={w.is_public ? `Make ${w.title} private` : `Share ${w.title} publicly`}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : w.is_public ? (
                  <Lock className="size-4" />
                ) : (
                  <Globe2 className="size-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => remove(w.id, w.title)}
                aria-label={`Delete ${w.title}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
