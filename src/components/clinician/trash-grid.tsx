"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { restoreTemplate, purgeTemplate } from "@/lib/actions/templates";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Template = Database["public"]["Tables"]["templates"]["Row"];

export function TrashGrid({ templates }: { templates: Template[] }) {
  return (
    <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((t) => (
        <StaggerItem key={t.id}>
          <TrashCard template={t} />
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}

function TrashCard({ template }: { template: Template }) {
  const [, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card className="relative overflow-hidden opacity-80 transition-opacity hover:opacity-100">
      <div
        className="flex h-20 items-center justify-center"
        style={{ backgroundColor: `${template.thumbnail_color}22` }}
      >
        <LayoutTemplate className="size-7" style={{ color: template.thumbnail_color ?? undefined }} />
      </div>
      <CardContent className="flex flex-col gap-2 pt-4">
        <p className="truncate font-medium">{template.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{template.domain}</Badge>
        </div>
        {template.deleted_at && (
          <p className="text-xs text-muted-foreground">Deleted {formatDate(template.deleted_at)}</p>
        )}
        <div className="mt-1 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() =>
              startTransition(async () => {
                const { error } = await restoreTemplate(template.id);
                if (error) toast.error(error);
                else toast.success("Restored");
              })
            }
          >
            <RotateCcw className="size-3.5" /> Restore
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete &ldquo;{template.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Any assignments already made from this template keep their own
              frozen copy, so patients aren&apos;t affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                startTransition(async () => {
                  const { error } = await purgeTemplate(template.id);
                  if (error) toast.error(error);
                  else toast.success("Permanently deleted");
                });
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
