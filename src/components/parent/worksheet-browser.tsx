"use client";

import { useState, useTransition } from "react";
import { Search, BookmarkPlus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveWorksheet } from "@/lib/actions/parent";

type LibraryTemplate = {
  id: string;
  title: string;
  domain: string;
  medium: string;
  thumbnail_color: string | null;
};

export function WorksheetBrowser({
  templates,
  savedTemplateIds,
  childId,
}: {
  templates: LibraryTemplate[];
  savedTemplateIds: string[];
  childId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>(savedTemplateIds);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = templates.filter((t) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || t.domain.toLowerCase().includes(q);
  });

  const save = (templateId: string) => {
    setPendingId(templateId);
    startTransition(async () => {
      const { error } = await saveWorksheet(templateId, childId);
      setPendingId(null);
      if (error) {
        toast.error(error);
        return;
      }
      setSaved((prev) => (prev.includes(templateId) ? prev : [...prev, templateId]));
      toast.success("Saved for home practice");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search printable worksheets by title or domain…"
          className="pl-9"
          aria-label="Search worksheets"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {templates.length === 0
              ? "No clinicians have published printable worksheets to the library yet."
              : "No worksheets match that search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const isSaved = saved.includes(t.id);
            return (
              <Card key={t.id}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <div
                    className="h-20 rounded-lg"
                    style={{ backgroundColor: t.thumbnail_color ?? "#e8edf3" }}
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{t.title}</p>
                    <Badge variant="outline">{t.domain}</Badge>
                  </div>
                  <Button
                    variant={isSaved ? "outline" : "default"}
                    size="sm"
                    disabled={isSaved || pendingId === t.id}
                    onClick={() => save(t.id)}
                  >
                    {pendingId === t.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isSaved ? (
                      <Check className="size-4" />
                    ) : (
                      <BookmarkPlus className="size-4" />
                    )}
                    {isSaved ? "Saved" : "Save for home practice"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
