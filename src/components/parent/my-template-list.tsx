"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe2, Lock, Trash2, Loader2, Pencil, Send, MonitorSmartphone, Plug, Printer } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setParentTemplateVisibility, deleteParentTemplate } from "@/lib/actions/parent";
import { AssignToChildDialog } from "@/components/parent/assign-to-child-dialog";
import type { ParentChild } from "@/lib/data/parent";
import type { TemplateMedium } from "@/lib/types/canvas";
import { formatDate } from "@/lib/utils";

export type MyTemplate = {
  id: string;
  title: string;
  domain: string;
  medium: TemplateMedium;
  is_public: boolean;
  thumbnail_color: string | null;
  updated_at: string;
};

const MEDIUM: Record<TemplateMedium, { label: string; icon: typeof Printer }> = {
  interactive: { label: "Interactive", icon: MonitorSmartphone },
  hybrid: { label: "Hybrid", icon: Plug },
  print: { label: "Printable", icon: Printer },
};

export function MyTemplateList({
  templates,
  childList,
  selectedChildId,
  emptyMessage,
}: {
  templates: MyTemplate[];
  childList: ParentChild[];
  selectedChildId: string | null;
  emptyMessage: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [assigning, setAssigning] = useState<MyTemplate | null>(null);

  const toggleVisibility = (id: string, next: boolean) => {
    setPendingId(id);
    startTransition(async () => {
      const { error } = await setParentTemplateVisibility(id, next);
      setPendingId(null);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(next ? "Shared to the public library" : "Set to private");
      router.refresh();
    });
  };

  const remove = (id: string, title: string) => {
    setPendingId(id);
    startTransition(async () => {
      const { error } = await deleteParentTemplate(id);
      setPendingId(null);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`Deleted “${title}”`);
      router.refresh();
    });
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => {
        const medium = MEDIUM[t.medium] ?? MEDIUM.print;
        // Scoped per card: a spinner on every card at once would suggest the
        // whole list was changing when only one row is.
        const busy = pendingId === t.id;
        return (
          <Card key={t.id}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <div
                className="h-20 rounded-lg"
                style={{ backgroundColor: t.thumbnail_color ?? "#e8edf3" }}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">Edited {formatDate(t.updated_at)}</p>
                </div>
                <Badge variant="outline">{t.domain}</Badge>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="w-fit gap-1">
                  <medium.icon className="size-3" />
                  {medium.label}
                </Badge>
                <Badge variant={t.is_public ? "success" : "secondary"} className="w-fit gap-1">
                  {t.is_public ? <Globe2 className="size-3" /> : <Lock className="size-3" />}
                  {t.is_public ? "Public" : "Private"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/parent/studio/${t.id}`}>
                    <Pencil className="size-4" /> Edit
                  </Link>
                </Button>
                {/* Only offered once a child is linked — there is nobody to
                    send it to otherwise. Sending works whether it is public
                    or private: your own child is not "the public". */}
                {childList.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssigning(t)}
                    aria-label={`Send ${t.title} to your child`}
                  >
                    <Send className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => toggleVisibility(t.id, !t.is_public)}
                  aria-label={t.is_public ? `Make ${t.title} private` : `Share ${t.title} publicly`}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : t.is_public ? (
                    <Lock className="size-4" />
                  ) : (
                    <Globe2 className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => remove(t.id, t.title)}
                  aria-label={`Delete ${t.title}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

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
