"use client";

import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";
import { TemplateCard } from "./template-card";
import type { Database } from "@/lib/types/database";

type Template = Database["public"]["Tables"]["templates"]["Row"];

export function TemplateGrid({ templates }: { templates: Template[] }) {
  return (
    <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((t) => (
        <StaggerItem key={t.id}>
          <TemplateCard template={t} />
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
