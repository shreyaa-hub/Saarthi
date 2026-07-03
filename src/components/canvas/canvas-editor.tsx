"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Cloud, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { useCanvasStore, useCanvasStoreInstance } from "@/lib/canvas/store";
import type { CanvasElement, TemplateCanvas, TemplateDomain, TemplateMedium } from "@/lib/types/canvas";
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
  const clipboard = useRef<CanvasElement[]>([]);
  const canUndo = useCanvasStore(store, (s) => s.past.length > 0);
  const canRedo = useCanvasStore(store, (s) => s.future.length > 0);

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
      const mod = e.metaKey || e.ctrlKey;
      const { selectedIds, elements, removeSelected, updateElement, undo, redo, duplicateSelected, addElement, selectMany } =
        store.getState();

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        removeSelected();
        return;
      }

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedIds.length > 0) duplicateSelected();
        return;
      }

      if (mod && e.key.toLowerCase() === "c") {
        if (selectedIds.length > 0) {
          clipboard.current = elements.filter((el) => selectedIds.includes(el.id));
        }
        return;
      }

      if (mod && e.key.toLowerCase() === "v") {
        if (clipboard.current.length > 0) {
          e.preventDefault();
          const pasted = clipboard.current.map((el) => ({
            ...el,
            id: `${el.id}-${Math.random().toString(36).slice(2, 7)}`,
            x: el.x + 20,
            y: el.y + 20,
          }));
          pasted.forEach((el) => addElement(el));
          selectMany(pasted.map((el) => el.id));
        }
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        // A single updateElement call is enough even for multi-select: the
        // store detects a pure x/y move on a multi-selected id and shifts
        // the whole selection by the same delta. Calling it per-id would
        // apply the delta once per selected element.
        const anchor = elements.find((el) => el.id === selectedIds[0]);
        if (anchor) updateElement(anchor.id, { x: anchor.x + dx, y: anchor.y + dy });
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
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => store.getState().undo()}
              disabled={!canUndo}
              className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => store.getState().redo()}
              disabled={!canRedo}
              className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="size-3.5" />
            </button>
          </div>
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

      <motion.div
        className="flex flex-1 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Palette store={store} />
        <div className="flex-1 overflow-hidden">
          <CanvasSurface store={store} />
        </div>
        <PropertiesPanel store={store} />
      </motion.div>
    </div>
  );
}
