import "server-only";
import { query, isAwsDbConfigured } from "@/lib/aws/db";

/**
 * Recomputes an invoice's status from the payments recorded against it.
 *
 * Previously an invoice stayed `pending` forever no matter how much had been collected, so the
 * dashboard's "Outstanding" figure showed what had been *invoiced* rather than what was actually
 * owed. Status is derived here rather than set by hand: a stored status that someone forgets to
 * update is worse than no status at all.
 *
 * Deliberately never overrides `draft` or `cancelled` — those are editorial states the payment
 * ledger has no business changing.
 */
export type InvoiceSettlement = {
  status: string;
  paid: number;
  total: number;
  outstanding: number;
};

export async function recalculateInvoiceStatus(invoiceId: string): Promise<InvoiceSettlement | null> {
  if (!isAwsDbConfigured) return null;

  const [row] = await query<{ status: string; total: number; paid: number; due_date: string }>(
    `select i.status::text as status,
            i.due_date,
            coalesce((select sum(ii.quantity * ii.rate - ii.discount + ii.tax)
                      from invoice_items ii where ii.invoice_id = i.id), 0) as total,
            coalesce((select sum(p.amount) from payments p
                      where p.invoice_id = i.id and p.status = 'paid'), 0) as paid
     from invoices i where i.id = :invoiceId`,
    { invoiceId }
  );
  if (!row) return null;

  const total = Number(row.total);
  const paid = Number(row.paid);

  // Leave editorial states alone.
  if (row.status === "draft" || row.status === "cancelled") {
    return { status: row.status, paid, total, outstanding: total - paid };
  }

  // A cent of float tolerance: sums of numerics can land a hair under the total and it would be
  // wrong to leave an invoice "partially paid" over a rounding artefact.
  let next: string;
  if (total > 0 && paid >= total - 0.01) {
    next = "paid";
  } else if (paid > 0) {
    next = "partially_paid";
  } else {
    next = new Date(row.due_date) < new Date(new Date().toDateString()) ? "overdue" : "pending";
  }

  if (next !== row.status) {
    await query(`update invoices set status = :status::invoice_status where id = :invoiceId`, {
      status: next,
      invoiceId,
    });
  }

  return { status: next, paid, total, outstanding: Math.max(0, total - paid) };
}

/**
 * Sweeps every unsettled invoice and marks the ones past their due date as overdue.
 *
 * Called when the invoices list is viewed, so the state reflects reality without needing a
 * scheduled job. Cheap: it touches only rows whose status is actually wrong.
 */
export async function markOverdueInvoices(): Promise<void> {
  if (!isAwsDbConfigured) return;
  await query(
    `update invoices set status = 'overdue'
     where status = 'pending' and due_date < current_date`
  );
}
