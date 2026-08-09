"use server";

import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { nextInvoiceNumber } from "@/lib/data/invoices";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { revalidatePath } from "next/cache";

interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  tax: number;
}

export interface CreateInvoiceInput {
  clientId: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  items: CreateInvoiceItemInput[];
}

/**
 * Inserts a new invoice + its line items into Aurora. Falls back to a no-op (just computes the
 * number/total) when AWS isn't configured, matching the Phase 1 "demo mode" simulate-only
 * behavior the form had before this was wired up.
 *
 * Not wrapped in a transaction (each query() call is independent) — acceptable for now since a
 * partial failure just leaves an invoice with fewer items than intended, which is visible and
 * fixable, but worth revisiting with withUserContext()-style transactional writes later.
 */
export async function createInvoiceAction(input: CreateInvoiceInput): Promise<{ number: string; total: number }> {
  const session = await requireInternalTeam();
  const number = await nextInvoiceNumber();
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.rate - item.discount + item.tax, 0);

  if (!isAwsDbConfigured) return { number, total };

  const rows = await query<{ id: string }>(
    `insert into invoices (client_id, number, status, currency, issue_date, due_date, notes)
     values (:clientId, :number, 'draft', :currency::currency_code, :issueDate, :dueDate, :notes)
     returning id`,
    {
      clientId: input.clientId,
      number,
      currency: input.currency,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      notes: input.notes ?? null,
    }
  );
  const invoiceId = rows[0].id;

  for (const item of input.items) {
    await query(
      `insert into invoice_items (invoice_id, description, quantity, rate, discount, tax)
       values (:invoiceId, :description, :quantity, :rate, :discount, :tax)`,
      {
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        tax: item.tax,
      }
    );
  }

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "invoice",
    action: `Invoice ${number} created`,
    entityId: invoiceId,
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");

  return { number, total };
}
