"use server";

import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { nextInvoiceNumber } from "@/lib/data/invoices";
import { revalidatePath } from "next/cache";

interface QuotationItemInput {
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  tax: number;
}

export interface CreateQuotationInput {
  clientId: string;
  currency: string;
  issueDate: string;
  validUntil: string;
  terms?: string;
  items: QuotationItemInput[];
}

/** Generates the next QUO-YYYY-NNNN reference, mirroring how invoice numbers are allocated. */
async function nextQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  if (!isAwsDbConfigured) return `QUO-${year}-0001`;

  const rows = await query<{ number: string }>(
    `select number from quotations where number like :prefix order by number desc limit 1`,
    { prefix: `QUO-${year}-%` }
  );
  const last = rows[0]?.number;
  const sequence = last ? Number(last.split("-")[2]) + 1 : 1;
  return `QUO-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function createQuotationAction(
  input: CreateQuotationInput
): Promise<{ number: string; total: number }> {
  const session = await requireInternalTeam();

  const number = await nextQuotationNumber();
  const total = input.items.reduce((sum, i) => sum + i.quantity * i.rate - i.discount + i.tax, 0);

  if (!isAwsDbConfigured) return { number, total };

  const rows = await query<{ id: string }>(
    `insert into quotations (client_id, number, status, currency, issue_date, valid_until, terms)
     values (:clientId, :number, 'draft', :currency, :issueDate, :validUntil, :terms)
     returning id`,
    {
      clientId: input.clientId,
      number,
      currency: input.currency,
      issueDate: input.issueDate,
      validUntil: input.validUntil,
      terms: input.terms ?? null,
    }
  );
  const quotationId = rows[0].id;

  for (const item of input.items) {
    await query(
      `insert into quotation_items (quotation_id, description, quantity, rate, discount, tax)
       values (:quotationId, :description, :quantity, :rate, :discount, :tax)`,
      {
        quotationId,
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
    action: `Quotation ${number} created`,
    entityId: quotationId,
  });

  revalidatePath("/quotations");
  revalidatePath("/dashboard");

  return { number, total };
}

/**
 * Copies a quotation and its line items into a new draft invoice, then marks the quotation
 * accepted. Previously the UI showed a "converted" toast and navigated away without writing
 * anything -- the invoice never existed.
 */
export async function convertQuotationToInvoiceAction(
  quotationId: string
): Promise<{ invoiceId: string; number: string }> {
  const session = await requireInternalTeam();

  if (!isAwsDbConfigured) {
    throw new Error("Converting quotations requires a database connection.");
  }

  const [quotation] = await query<{ client_id: string; currency: string; terms: string | null }>(
    `select client_id, currency, terms from quotations where id = :quotationId`,
    { quotationId }
  );
  if (!quotation) throw new Error("Quotation not found.");

  const items = await query<{
    description: string;
    quantity: number;
    rate: number;
    discount: number;
    tax: number;
  }>(
    `select description, quantity, rate, discount, tax from quotation_items where quotation_id = :quotationId`,
    { quotationId }
  );

  const number = await nextInvoiceNumber();
  const issueDate = new Date().toISOString().slice(0, 10);
  // Default to net-14 terms; the invoice is created as a draft so this can be edited before sending.
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const invoiceRows = await query<{ id: string }>(
    `insert into invoices (client_id, number, status, currency, issue_date, due_date, notes)
     values (:clientId, :number, 'draft', :currency, :issueDate, :dueDate, :notes)
     returning id`,
    {
      clientId: quotation.client_id,
      number,
      currency: quotation.currency,
      issueDate,
      dueDate,
      notes: quotation.terms,
    }
  );
  const invoiceId = invoiceRows[0].id;

  for (const item of items) {
    await query(
      `insert into invoice_items (invoice_id, description, quantity, rate, discount, tax)
       values (:invoiceId, :description, :quantity, :rate, :discount, :tax)`,
      {
        invoiceId,
        description: item.description,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        discount: Number(item.discount),
        tax: Number(item.tax),
      }
    );
  }

  await query(`update quotations set status = 'accepted' where id = :quotationId`, { quotationId });

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "invoice",
    action: `Quotation converted to invoice ${number}`,
    entityId: invoiceId,
  });

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");

  return { invoiceId, number };
}
