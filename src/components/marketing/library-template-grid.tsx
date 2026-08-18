"use client";

import { useMemo, useState } from "react";
import { Search, LayoutTemplate, Eye } from "lucide-react";
import { loadTemplatePreview } from "@/lib/actions/library";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TemplatePreviewDialog,
  type ViewerRole,
  type PreviewDetail,
} from "@/components/library/template-preview-dialog";

type LibraryTemplate = {
  id: string;
  title: string;
  domain: string;
  medium: string;
  thumbnail_color: string | null;
  updated_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  clinician: "Preview and import",
  parent: "Preview and import",
  patient: "Preview and try",
};

export function LibraryTemplateGrid({
  templates,
  role,
}: {
  templates: LibraryTemplate[];
  role: ViewerRole;
}) {
  const [query, setQuery] = useState("");
  const [previewing, setPreviewing] = useState<LibraryTemplate | null>(null);
  const [detail, setDetail] = useState<PreviewDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Canvases are fetched one at a time, on the click that asks to see one.
  // The grid lists dozens of cards and loading every canvas up front to
  // populate previews nobody opened would be most of the payload wasted.
  const openPreview = async (t: LibraryTemplate) => {
    setPreviewing(t);
    setDetail(null);
    setFailed(false);
    setLoading(true);
    try {
      const res = await loadTemplatePreview(t.id);
      if (res.error || !res.detail) setFailed(true);
      else setDetail(res.detail as unknown as PreviewDetail);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.medium.toLowerCase().includes(q),
    );
  }, [templates, query]);

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <LayoutTemplate className="size-6" />
          </span>
          <p className="font-medium">Nothing published here yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Clinicians and parents can share what they build to this library from their own
            workspace.
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
          placeholder="Search by title, area, or type…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No matches for &ldquo;{query}&rdquo;.
        </p>
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
                  {/* One entry point for everyone. What the preview then
                      offers depends on who is looking, so the card does not
                      have to carry three different buttons. */}
                  <Button size="sm" variant="outline" onClick={() => openPreview(t)}>
                    <Eye className="size-3.5" />
                    {role ? ACTION_LABEL[role] ?? "Preview" : "Preview"}
                  </Button>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      {previewing && (
        <TemplatePreviewDialog
          key={previewing.id}
          templateId={previewing.id}
          title={previewing.title}
          role={role}
          detail={detail}
          loading={loading}
          failed={failed}
          open={previewing !== null}
          onOpenChange={(o) => !o && setPreviewing(null)}
        />
      )}
    </div>
  );
}
