"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  MonitorSmartphone,
  Plug,
  Printer,
  Compass,
  Wrench,
  LayoutTemplate,
  FilePlus2,
  Check,
} from "lucide-react";
import { createTemplateFromWizard, type WizardSource } from "@/lib/actions/templates";
import { BLUEPRINTS } from "@/lib/canvas/blueprints";
import { TEMPLATE_DOMAINS, type TemplateDomain, type TemplateMedium } from "@/lib/types/canvas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";

type EntryPoint = "blank" | "interactive-shell" | "printable-forms";

type Step =
  | "medium"
  | "foundation"
  | "blueprint-registry"
  | "node-initialize"
  | "reusable-picker"
  | "identity";

type ExistingTemplate = {
  id: string;
  title: string;
  domain: string;
  medium: string;
  updated_at: string;
};

const mediumOptions: { value: TemplateMedium; label: string; body: string; icon: typeof MonitorSmartphone }[] = [
  { value: "interactive", label: "Interactive", body: "Digital — patients tap, type, and drag on screen.", icon: MonitorSmartphone },
  { value: "hybrid", label: "Hybrid", body: "Integrated — a mix of on-screen and physical practice.", icon: Plug },
  { value: "print", label: "Print", body: "Static — designed to be printed and used on paper.", icon: Printer },
];

const STEP_LABELS: Record<Step, string> = {
  medium: "Medium",
  foundation: "Foundation",
  "blueprint-registry": "Blueprint Registry",
  "node-initialize": "Node Initialize",
  "reusable-picker": "Choose a Template",
  identity: "Identity",
};

const STAGE_ORDER = ["Medium", "Foundation", "Identity", "Canvas"];

function stageForStep(step: Step): string {
  if (step === "medium") return "Medium";
  if (step === "identity") return "Identity";
  return "Foundation";
}

export function InitializeWizard({
  entry,
  myTemplates,
}: {
  entry: EntryPoint;
  myTemplates: ExistingTemplate[];
}) {
  const [step, setStep] = useState<Step>(entry === "blank" ? "medium" : "foundation");
  const [medium, setMedium] = useState<TemplateMedium>(entry === "printable-forms" ? "print" : "interactive");
  const [foundationPath, setFoundationPath] = useState<"blueprint" | "direct" | null>(null);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);
  const [nodeHierarchy, setNodeHierarchy] = useState<"reusable" | "fresh" | null>(null);
  const [selectedExistingId, setSelectedExistingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<TemplateDomain>("General");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleBlueprints = useMemo(
    () => BLUEPRINTS.filter((b) => b.medium === medium),
    [medium],
  );

  const source: WizardSource =
    foundationPath === "blueprint" && selectedBlueprintId
      ? { type: "blueprint", blueprintId: selectedBlueprintId }
      : nodeHierarchy === "reusable" && selectedExistingId
        ? { type: "existing", templateId: selectedExistingId }
        : { type: "blank" };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("Give this a name before continuing.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createTemplateFromWizard({ medium, title, domain, subdomain, source });
      if (result?.error) setError(result.error);
    });
  };

  const goBack = () => {
    if (step === "foundation") {
      if (entry === "blank") setStep("medium");
      return;
    }
    if (step === "blueprint-registry" || step === "node-initialize") {
      setStep("foundation");
      return;
    }
    if (step === "reusable-picker") {
      setStep("node-initialize");
      return;
    }
    if (step === "identity") {
      if (foundationPath === "blueprint") setStep("blueprint-registry");
      else if (nodeHierarchy === "reusable") setStep("reusable-picker");
      else setStep("node-initialize");
    }
  };

  const canGoBack = !(step === "medium" || (step === "foundation" && entry !== "blank"));
  const currentStage = stageForStep(step);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        {canGoBack ? (
          <button
            type="button"
            onClick={goBack}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <Link
            href="/clinician/studio"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </Link>
        )}
        <div>
          <h1 className="font-display text-xl font-semibold">Initialize a template</h1>
          <p className="text-sm text-muted-foreground">{STEP_LABELS[step]}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {STAGE_ORDER.map((s, i) => {
          const active = s === currentStage;
          const passedIndex = STAGE_ORDER.indexOf(currentStage);
          const done = i < passedIndex;
          return (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                {s}
              </span>
              {i < STAGE_ORDER.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
      {step === "medium" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {mediumOptions.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setMedium(m.value);
                setStep("foundation");
              }}
              className="cursor-pointer text-left"
            >
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-col gap-3 pt-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                    <m.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{m.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {step === "foundation" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setFoundationPath("blueprint");
              setStep("blueprint-registry");
            }}
            className="cursor-pointer text-left"
          >
            <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex flex-col gap-3 pt-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Compass className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">Blueprint Base</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Standard path — start from a proven blueprint in the registry.
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => {
              setFoundationPath("direct");
              setStep("node-initialize");
            }}
            className="cursor-pointer text-left"
          >
            <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex flex-col gap-3 pt-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Wrench className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">Direct Build</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Direct authoring — start from one of your own templates, or blank.
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
        </div>
      )}

      {step === "blueprint-registry" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Blueprints for the <span className="font-medium text-foreground">{medium}</span> medium.
          </p>
          {visibleBlueprints.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No blueprints for this medium yet.{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline cursor-pointer"
                  onClick={() => {
                    setFoundationPath("direct");
                    setStep("node-initialize");
                  }}
                >
                  Try Direct Build instead
                </button>
                .
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleBlueprints.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelectedBlueprintId(b.id);
                    setTitle(b.title);
                    setDomain(b.domain);
                    setStep("identity");
                  }}
                  className="cursor-pointer text-left"
                >
                  <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                    <CardContent className="flex flex-col gap-2 pt-6">
                      <span
                        className="flex size-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${b.thumbnailColor}22`, color: b.thumbnailColor }}
                      >
                        <LayoutTemplate className="size-4" />
                      </span>
                      <p className="font-semibold">{b.title}</p>
                      <p className="text-sm text-muted-foreground">{b.description}</p>
                      <Badge variant="outline" className="w-fit">{b.domain}</Badge>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "node-initialize" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-muted-foreground">Select node hierarchy</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setNodeHierarchy("reusable");
                setStep("reusable-picker");
              }}
              className="cursor-pointer text-left"
            >
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-col gap-3 pt-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                    <LayoutTemplate className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Reusable Template</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start from a copy of one of your existing templates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
            <button
              type="button"
              onClick={() => {
                setNodeHierarchy("fresh");
                setStep("identity");
              }}
              className="cursor-pointer text-left"
            >
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-col gap-3 pt-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                    <FilePlus2 className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Fresh Tool</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start completely blank on the canvas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          </div>
        </div>
      )}

      {step === "reusable-picker" && (
        <div className="flex flex-col gap-3">
          {myTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
                <p>You don&apos;t have any templates yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNodeHierarchy("fresh");
                    setStep("identity");
                  }}
                >
                  Start fresh instead
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {myTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedExistingId(t.id);
                    setTitle(`${t.title} (copy)`);
                    setDomain((t.domain as TemplateDomain) || "General");
                    setStep("identity");
                  }}
                  className="cursor-pointer text-left"
                >
                  <Card className="transition-all hover:border-primary/40 hover:shadow-md">
                    <CardContent className="flex items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">Updated {formatDate(t.updated_at)}</p>
                      </div>
                      <Badge variant="outline">{t.domain}</Badge>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "identity" && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wiz-title">Registry label</Label>
              <Input
                id="wiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Feelings Check-in"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Domain</Label>
                <Select value={domain} onValueChange={(v) => setDomain(v as TemplateDomain)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_DOMAINS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wiz-subdomain">Subdomain (optional)</Label>
                <Input
                  id="wiz-subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="e.g. /s/ blends"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleSubmit} disabled={pending} className="mt-1 self-start">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Open canvas
            </Button>
          </CardContent>
        </Card>
      )}
      </motion.div>
      </AnimatePresence>
    </div>
  );
}
