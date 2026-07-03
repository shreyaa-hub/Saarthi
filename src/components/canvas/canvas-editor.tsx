"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Cloud } from "lucide-react";
import { toast } from "sonner";
import { useCanvasStoreInstance } from "@/lib/canvas/store";
import type { TemplateCanvas, TemplateDomain, TemplateMedium } from "@/lib/types/canvas";
import { TEMPLATE_DOMAINS } from "@/lib/types/canvas";
import { saveTemplateCanvas, setTemplateStatus, updateTemplateMeta } from "@/lib/actions/templates";
import { Palette } from "./palette";
import { CanvasSurface } from "./canvas-surface";
import { PropertiesPanel } from "./properties-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TemplateRow = {
  id: string;
  title: string;
  domain: string;
  medium: TemplateMedium;
  status: "draft" | "published" | "archived";
  canvas: TemplateCanvas;
};

export function CanvasEditor({ template }: { template: TemplateRow }) {
  const router = useRouter();
  const store = useCanvasStoreInstance(template.canvas);

  const [title, setTitle] = useState(template.title);
  const [domain, setDomain] = useState(template.domain);
  const [status, setStatus] = useState(template.status);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("saved");
  const [, startTransition] = useTransition();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = store.subscribe((state) => {
      if (!state.dirty) return;
      setSaveState("idle");
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaveState("saving");
        const canvas = store.getState().toCanvas();
        const { error } = await saveTemplateCanvas(template.id, canvas);
        if (error) {
          toast.error(`Couldn't save: ${error}`);
        } else {
          store.getState().markSaved();
          setSaveState("saved");
        }
      }, 900);
    });
    return unsub;
  }, [store, template.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const { selectedId, removeElement } = store.getState();
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeElement(selectedId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  const commitMeta = (fields: { title?: string; domain?: string }) => {
    startTransition(async () => {
      await updateTemplateMeta(template.id, fields);
    });
  };

  const togglePublish = () => {
    const next = status === "published" ? "draft" : "published";
    setStatus(next);
    startTransition(async () => {
      const { error } = await setTemplateStatus(template.id, next);
      if (error) toast.error(error);
      else toast.success(next === "published" ? "Template published" : "Moved back to draft");
    });
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/clinician/studio"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => commitMeta({ title })}
            className="h-9 w-48 border-transparent bg-transparent px-2 font-semibold shadow-none hover:border-input focus-visible:border-input md:w-64"
          />
          <Select
            value={domain}
            onValueChange={(v) => {
              setDomain(v);
              commitMeta({ domain: v });
            }}
          >
            <SelectTrigger className="hidden h-9 w-44 sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_DOMAINS.map((d: TemplateDomain) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            {saveState === "saving" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving…
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="size-3.5" /> All changes saved
              </>
            ) : (
              <>
                <Cloud className="size-3.5" /> Unsaved changes
              </>
            )}
          </span>
          <Badge variant={status === "published" ? "success" : "outline"}>{status}</Badge>
          <Button size="sm" variant={status === "published" ? "outline" : "default"} onClick={togglePublish}>
            {status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push("/clinician/studio")}>
            Done
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Palette store={store} />
        <div className="flex-1 overflow-hidden">
          <CanvasSurface store={store} />
        </div>
        <PropertiesPanel store={store} />
      </div>
    </div>
  );
}
