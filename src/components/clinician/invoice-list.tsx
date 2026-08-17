"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Ban, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setInvoiceStatus } from "@/lib/actions/billing";
import type { InvoiceStatus } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";

export type IssuedInvoice = {
  id: string;
  reference: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  due_date: string | null;
  status: InvoiceStatus;
  issued_at: string;
  parent: { full_name: string } | null;
};

const statusVariant: Record<InvoiceStatus, "success" | "secondary" | "outline"> = {
  paid: "success",
  issued: "secondary",
  void: "outline",
  draft: "outline",
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(
    cents / 100,
  );
}

export function InvoiceList({ invoices }: { invoices: IssuedInvoice[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const update = (id: string, status: InvoiceStatus, label: string) => {
    startTransition(async () => {
      const { error } = await setInvoiceStatus(id, status);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(label);
      router.refresh();
    });
  };

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <Wallet className="size-6" />
          </span>
          <p className="font-medium">No statements yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Issue one to record what a family owes. It appears in their Finances tab straight away.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 pr-3 font-medium">Bill to</th>
                <th className="py-2 pr-3 font-medium">Issued</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 pr-3 text-right font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{i.reference}</p>
                    {i.description && (
                      <p className="text-xs text-muted-foreground">{i.description}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{i.parent?.full_name ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(i.issued_at)}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {i.due_date ? formatDate(i.due_date) : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {formatAmount(i.amount_cents, i.currency)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={statusVariant[i.status] ?? "outline"}>{i.status}</Badge>
                  </td>
                  <td className="py-2.5 text-right">
                    {/* Only an outstanding statement can be settled or
                        cancelled; a paid or voided one is already final. */}
                    {i.status === "issued" && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => update(i.id, "paid", `${i.reference} marked paid`)}
                          aria-label={`Mark ${i.reference} paid`}
                        >
                          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => update(i.id, "void", `${i.reference} voided`)}
                          aria-label={`Void ${i.reference}`}
                        >
                          <Ban className="size-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
