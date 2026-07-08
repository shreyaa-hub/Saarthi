"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";
import { Input } from "@/components/ui/input";
import { TemplateCard } from "./template-card";
import type { Database } from "@/lib/types/database";

type Template = Database["public"]["Tables"]["templates"]["Row"];

export function TemplateGrid({ templates }: { templates: Template[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q),
    );
  }, [templates, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates by title, domain, or status…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No templates match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <StaggerItem key={t.id}>
              <TemplateCard template={t} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
