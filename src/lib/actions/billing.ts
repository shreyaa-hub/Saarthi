"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/auth";
import type { InvoiceStatus } from "@/lib/types/database";
import { notify } from "@/lib/actions/notifications";

// Money is handled in integer minor units end to end — never a float. A
// parsed "12.35" becomes 1235, so no rounding error can creep into a figure
// someone is expected to pay.
function toMinorUnits(amount: string): number | null {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export async function issueInvoice(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parentId = String(formData.get("parent_id") || "");
  const childId = String(formData.get("child_id") || "") || null;
  const reference = String(formData.get("reference") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const amount = String(formData.get("amount") || "");
  const dueDate = String(formData.get("due_date") || "") || null;
  const periodStart = String(formData.get("period_start") || "") || null;
  const periodEnd = String(formData.get("period_end") || "") || null;

  if (!parentId) return { error: "Choose who this is for." };
  if (!reference) return { error: "Give the statement a reference." };

  const amountCents = toMinorUnits(amount);
  if (amountCents === null) return { error: "Enter an amount like 1200 or 1200.50." };
  if (amountCents === 0) return { error: "Amount must be more than zero." };

  if (periodStart && periodEnd && periodEnd < periodStart) {
    return { error: "The period's end date is before its start date." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Authorization is enforced by invoices_clinician_insert + can_bill(); this
  // insert simply fails if the parent isn't a guardian of one of the
  // clinician's own patients.
  const { error } = await supabase.from("invoices").insert({
    clinician_id: user.id,
    parent_id: parentId,
    child_id: childId,
    reference,
    description: description || null,
    amount_cents: amountCents,
    period_start: periodStart,
    period_end: periodEnd,
    due_date: dueDate,
    status: "issued",
  });

  if (error) return { error: error.message };

  await notify(
    supabase,
    parentId,
    "invoice_issued",
    "New statement",
    `${reference} — see Finances`,
    "/parent/finances",
  );

  revalidatePath("/clinician/billing");
  return { error: null, message: `Statement ${reference} issued` };
}

export async function setInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)
    .eq("clinician_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/clinician/billing");
  return { error: null };
}
