"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, LayoutTemplate, Download } from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { importTemplate } from "@/lib/actions/library";

type LibraryTemplate = {
  id: string;
  title: string;
  domain: string;
  medium: string;
  thumbnail_color: string | null;
  updated_at: string;
};

export function LibraryTemplateGrid({
  templates,
  canImport,
}: {
  templates: LibraryTemplate[];
  canImport: boolean;
}) {
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.title.toLowerCase().includes(q) || t.domain.toLowerCase().includes(q),
    );
  }, [templates, query]);

  const handleImport = (id: string) => {
    startTransition(async () => {
      const result = await importTemplate(id);
      if (result?.error) toast.error(result.error);
    });
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <LayoutTemplate className="size-6" />
          </span>
          <p className="font-medium">Nothing published here yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Clinicians can share a template to this library from the Template Studio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or domain…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No matches for &ldquo;{query}&rdquo;.</p>
      ) : (
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <StaggerItem key={t.id}>
              <Card className="overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
                <div
                  className="flex h-24 items-center justify-center"
                  style={{ backgroundColor: `${t.thumbnail_color}22` }}
                >
                  <LayoutTemplate className="size-7" style={{ color: t.thumbnail_color ?? undefined }} />
                </div>
                <CardContent className="flex flex-col gap-3 pt-4">
                  <div>
                    <p className="truncate font-medium">{t.title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{t.domain}</Badge>
                      <Badge variant="secondary">{t.medium}</Badge>
                    </div>
                  </div>
                  {canImport ? (
                    <Button size="sm" variant="outline" onClick={() => handleImport(t.id)}>
                      <Download className="size-3.5" /> Import to my Studio
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/sign-up">Sign up to import</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
