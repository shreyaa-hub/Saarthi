"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MoreHorizontal, Copy, Trash2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { duplicateTemplate, deleteTemplate, restoreTemplate } from "@/lib/actions/templates";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Template = Database["public"]["Tables"]["templates"]["Row"];

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  published: "success",
  draft: "secondary",
  archived: "outline",
};

export function TemplateCard({ template }: { template: Template }) {
  const [, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      const { error } = await deleteTemplate(template.id);
      if (error) {
        toast.error(error);
        return;
      }
      toast("Template moved to trash", {
        action: {
          label: "Undo",
          onClick: () => {
            startTransition(async () => {
              const res = await restoreTemplate(template.id);
              if (res.error) toast.error(res.error);
              else toast.success("Restored");
            });
          },
        },
      });
    });
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
      <div
        className="flex h-28 items-center justify-center transition-colors"
        style={{ backgroundColor: `${template.thumbnail_color}22` }}
      >
        <LayoutTemplate
          className="size-8 transition-transform group-hover:scale-110"
          style={{ color: template.thumbnail_color ?? undefined }}
        />
      </div>
      <CardContent className="flex items-start justify-between gap-2 pt-4">
        <div className="min-w-0">
          <Link
            href={`/clinician/studio/${template.id}`}
            className="truncate font-medium after:absolute after:inset-0 after:content-['']"
          >
            {template.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={statusVariant[template.status]}>{template.status}</Badge>
            <Badge variant="outline">{template.domain}</Badge>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Updated {formatDate(template.updated_at)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative z-10 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() =>
                startTransition(async () => {
                  const { error } = await duplicateTemplate(template.id);
                  if (error) toast.error(error);
                  else toast.success("Template duplicated");
                })
              }
            >
              <Copy className="size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move &ldquo;{template.title}&rdquo; to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              It&apos;ll be moved to Trash and can be restored later, or permanently deleted from there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
