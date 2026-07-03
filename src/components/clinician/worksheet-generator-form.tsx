"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEMPLATE_DOMAINS, type TemplateDomain } from "@/lib/types/canvas";

export function WorksheetGeneratorForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [domain, setDomain] = useState<TemplateDomain>("General");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim()) {
      setError("Describe a topic first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, domain, instructions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate a worksheet.");
        return;
      }
      toast.success("Worksheet drafted — refine it on the canvas");
      router.push(`/clinician/studio/${data.templateId}`);
    } catch {
      setError("Network error while generating the worksheet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/clinician/studio"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Worksheet Generator</h1>
          <p className="text-sm text-muted-foreground">
            Describe a topic — Claude drafts a printable worksheet you can refine on the canvas.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-topic">Topic</Label>
            <Input
              id="ws-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Coping strategies for test anxiety"
              autoFocus
            />
          </div>
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
            <Label htmlFor="ws-instructions">Instructions (optional)</Label>
            <Textarea
              id="ws-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Any specifics — age range, tone, number of prompts, etc."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={generate} disabled={loading} className="mt-1 self-start">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            Generate worksheet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
