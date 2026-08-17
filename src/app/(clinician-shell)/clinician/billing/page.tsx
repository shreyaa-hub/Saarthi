import { requireProfile } from "@/lib/auth/session";
import { getBillableParents, getIssuedInvoices } from "@/lib/data/clinician";
import { IssueInvoiceDialog } from "@/components/clinician/issue-invoice-dialog";
import { InvoiceList, type IssuedInvoice } from "@/components/clinician/invoice-list";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default async function BillingPage() {
  const { supabase, user } = await requireProfile("clinician");
  const [parents, invoices] = await Promise.all([
    getBillableParents(supabase),
    getIssuedInvoices(supabase, user.id),
  ]);

  const outstanding = invoices
    .filter((i) => i.status === "issued")
    .reduce((sum, i) => sum + i.amount_cents, 0);
  const currency = invoices[0]?.currency ?? "INR";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Statements you&apos;ve issued to the families on your caseload.
          </p>
        </div>
        <IssueInvoiceDialog parents={parents} />
      </div>

      <Card>
        <CardContent className="flex items-start gap-2.5 pt-6 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Saarthi Coach does not process payments. These are a record only — arrange payment with
            the family directly, then mark the statement paid here so it shows as settled on their
            side. Outstanding:{" "}
            <span className="font-medium text-foreground">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(outstanding / 100)}
            </span>
          </p>
        </CardContent>
      </Card>

      {parents.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No guardians are linked to your patients yet. Share a patient&apos;s{" "}
            <span className="font-medium text-foreground">guardian code</span> from Caseload so a
            parent can connect — then you can issue statements to them.
          </CardContent>
        </Card>
      )}

      <InvoiceList invoices={invoices as unknown as IssuedInvoice[]} />
    </div>
  );
}
