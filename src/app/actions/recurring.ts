"use server";

import { revalidatePath } from "next/cache";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { setInvoiceRecurrence, type RecurrenceInterval } from "@/lib/data/recurring-invoices";

const INTERVALS: RecurrenceInterval[] = ["monthly", "quarterly", "yearly"];

/**
 * Puts an invoice on a repeating schedule, or takes it off one.
 *
 * The interval is validated against a fixed list rather than passed through — it is interpolated
 * into a Postgres interval literal downstream, so accepting arbitrary input here would be an
 * injection point.
 */
export async function setInvoiceRecurrenceAction(
  invoiceId: string,
  interval: string | null
): Promise<void> {
  const session = await requireInternalTeam();

  const normalised = interval && INTERVALS.includes(interval as RecurrenceInterval)
    ? (interval as RecurrenceInterval)
    : null;
  if (interval && !normalised) throw new Error("Unknown billing frequency.");

  await setInvoiceRecurrence(invoiceId, normalised);

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "invoice",
    action: normalised ? `Invoice set to repeat ${normalised}` : "Invoice recurrence turned off",
    entityId: invoiceId,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}
