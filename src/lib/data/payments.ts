import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { payments as mockPayments } from "@/lib/mock-data";
import type { Payment } from "@/types";

interface PaymentRow {
  id: string;
  invoice_id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    method: row.method as Payment["method"],
    status: row.status as Payment["status"],
    date: row.paid_at ?? row.created_at,
  };
}

export async function getPayments(): Promise<Payment[]> {
  if (!isAwsDbConfigured) return mockPayments;
  const rows = await query<PaymentRow>(
    `select id, invoice_id, amount, method, status, paid_at, created_at from payments order by created_at desc`
  );
  return rows.map(rowToPayment);
}

/** Payments recorded against one invoice, newest first. Powers the settlement panel on the invoice. */
export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
  if (!isAwsDbConfigured) return mockPayments.filter((p) => p.invoiceId === invoiceId);
  const rows = await query<PaymentRow>(
    `select id, invoice_id, amount, method, status, paid_at, created_at
     from payments where invoice_id = :invoiceId
     order by coalesce(paid_at, created_at) desc`,
    { invoiceId }
  );
  return rows.map(rowToPayment);
}
