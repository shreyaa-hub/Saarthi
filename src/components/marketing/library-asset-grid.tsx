"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, ImageIcon, Copy, Trash2 } from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadButton } from "@/components/canvas/image-upload-button";
import { publishAsset, deleteAsset } from "@/lib/actions/library";

type LibraryAsset = {
  id: string;
  owner_id: string;
  url: string;
  alt: string;
  created_at: string;
};

export function LibraryAssetGrid({
  assets,
  viewerId,
}: {
  assets: LibraryAsset[];
  viewerId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [altDraft, setAltDraft] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => a.alt.toLowerCase().includes(q));
  }, [assets, query]);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handlePublish = (url: string) => {
    startTransition(async () => {
      const result = await publishAsset(url, altDraft);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Asset published");
        setAltDraft("");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteAsset(id);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {viewerId && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Input
                value={altDraft}
                onChange={(e) => setAltDraft(e.target.value)}
                placeholder="e.g. Happy cartoon sun icon"
                className="mt-1.5"
              />
            </div>
            <div className="sm:w-48">
              <ImageUploadButton onUploaded={handlePublish} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by description…"
          aria-label="Search the asset library"
          className="pl-9"
        />
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <ImageIcon className="size-6" />
            </span>
            <p className="font-medium">Nothing published here yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Clinicians can publish images here to share with the whole platform.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No matches for &ldquo;{query}&rdquo;.</p>
      ) : (
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((a) => (
            <StaggerItem key={a.id}>
              <Card className="group relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.alt} className="h-32 w-full object-cover" />
                <CardContent className="flex items-center justify-between gap-2 p-2">
                  <p className="truncate text-xs text-muted-foreground">{a.alt}</p>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => copyLink(a.url)}>
                      <Copy className="size-3.5" />
                    </Button>
                    {viewerId === a.owner_id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
