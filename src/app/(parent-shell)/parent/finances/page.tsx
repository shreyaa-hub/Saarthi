import { Wallet, Info } from "lucide-react";
import { getParentContext } from "@/lib/parent/context";
import { getMyInvoices } from "@/lib/data/parent";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types/database";

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

// Scope note: this is a read-only statement view. There is no payment
// processing anywhere in this product — no card capture, no wallet, no
// gateway — so `status` reflects what the clinician recorded after being
// paid out of band. Deliberately no "Pay now" affordance: a button that
// looked like it took payment but didn't would be worse than no button.
export default async function ParentFinancesPage() {
  const { supabase, user } = await getParentContext();
  const invoices = await getMyInvoices(supabase, user.id);

  const outstanding = invoices
    .filter((i) => i.status === "issued")
    .reduce((sum, i) => sum + i.amount_cents, 0);
  const currency = invoices[0]?.currency ?? "INR";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Finances</h2>
        <p className="text-sm text-muted-foreground">
          Statements your child&apos;s clinician has issued to you.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 pt-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="text-2xl font-semibold">{formatAmount(outstanding, currency)}</p>
            <p className="text-xs text-muted-foreground">Outstanding across unpaid statements</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-2.5 pt-6 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Payments are arranged directly with your clinic — this page is a record only, and no payment is
            taken through Saarthi Coach. A statement is marked paid here once your clinician records it.
          </p>
        </CardContent>
      </Card>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <Wallet className="size-6" />
            </span>
            <p className="font-medium">No statements yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Anything your clinician issues will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Reference</th>
                    <th className="py-2 pr-3 font-medium">Description</th>
                    <th className="py-2 pr-3 font-medium">Issued</th>
                    <th className="py-2 pr-3 font-medium">Due</th>
                    <th className="py-2 pr-3 text-right font-medium">Amount</th>
                    <th className="py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className="border-b border-border/60">
                      <td className="py-2.5 pr-3 font-medium">{i.reference}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{i.description ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(i.issued_at)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {i.due_date ? formatDate(i.due_date) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {formatAmount(i.amount_cents, i.currency)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge variant={statusVariant[i.status] ?? "outline"}>{i.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
