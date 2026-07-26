import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export type RankingRow = {
  key: string;
  name: string;
  href: string | null;
  // Right-aligned emphasis value (e.g. "+18%" or "7").
  metric: string;
  metricClass?: string;
  // Muted supporting context under the name (e.g. "70% → 88% · 4 activities").
  detail: string;
};

// Shared list card for the caseload rankings (Most Improved / Most Active).
// Deliberately the same avatar + name + right-aligned-metric row rhythm as
// the dashboard's existing "Recent activity" list, so the two ranking cards
// read as siblings of a pattern the clinician already knows rather than a
// new component. Rows link through to the patient when a caseload link is
// available.
export function RankingCard({
  title,
  icon: Icon,
  rows,
  emptyText,
}: {
  title: string;
  icon: LucideIcon;
  rows: RankingRow[];
  emptyText: string;
}) {
  const isEmpty = rows.length === 0;
  return (
    // self-start keeps an empty card at its natural (short) height instead of
    // stretching to match a populated sibling in the same grid row.
    <Card className={isEmpty ? "self-start" : undefined}>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={isEmpty ? "pt-0" : undefined}>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {rows.map((row) => {
              const body = (
                <>
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">{initials(row.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.detail}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${row.metricClass ?? ""}`}>
                    {row.metric}
                  </span>
                </>
              );
              return row.href ? (
                <Link
                  key={row.key}
                  href={row.href}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
                >
                  {body}
                </Link>
              ) : (
                <div key={row.key} className="flex items-center gap-3 py-3">
                  {body}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
