"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatDate, cn } from "@/lib/utils";
import { PatientRowActions } from "@/components/clinician/patient-row-actions";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group";

const statusStyles: Record<string, "success" | "secondary" | "outline"> = {
  active: "success",
  invited: "secondary",
  archived: "outline",
};

type CaseloadRow = {
  id: string;
  status: string;
  display_name: string;
  invite_code: string;
  created_at: string;
  patient_id: string | null;
  profiles: { full_name: string; email: string | null } | null;
};

export function CaseloadList({
  caseload,
  placeholder = "Search patients by name or status…",
}: {
  caseload: CaseloadRow[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return caseload;
    return caseload.filter((row) => {
      const name = row.profiles?.full_name ?? row.display_name;
      return name.toLowerCase().includes(q) || row.status.toLowerCase().includes(q);
    });
  }, [caseload, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No patients match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <StaggerGroup className="grid gap-3">
          {filtered.map((row) => {
            const name = row.profiles?.full_name ?? row.display_name;
            const linked = Boolean(row.patient_id);
            return (
              <StaggerItem key={row.id}>
                <Card
                  className={cn(
                    "relative transition-all",
                    linked && "hover:border-primary/40 hover:shadow-md",
                  )}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <Avatar className="size-11 shrink-0">
                      <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      {linked ? (
                        <Link
                          href={`/clinician/caseload/${row.id}`}
                          className="truncate font-medium after:absolute after:inset-0 after:content-['']"
                        >
                          {name}
                        </Link>
                      ) : (
                        <p className="truncate font-medium">{name}</p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {row.profiles?.email ?? `Invited ${formatDate(row.created_at)}`}
                      </p>
                    </div>
                    <Badge variant={statusStyles[row.status]}>{row.status}</Badge>
                    {linked && (
                      <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                    )}
                    <div className="relative z-10">
                      <PatientRowActions id={row.id} status={row.status} inviteCode={row.invite_code} />
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}
    </div>
  );
}
