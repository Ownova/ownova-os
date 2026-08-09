"use server";

import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { nextInvoiceNumber, getInvoiceById } from "@/lib/data/invoices";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";
import { sendEmail, isSesConfigured } from "@/lib/aws/ses";
import { agency } from "@/lib/agency";
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

/**
 * Emails an invoice to its client with the generated PDF attached.
 *
 * Sends through SES rather than a third-party provider: the infrastructure is already on AWS, it
 * costs a fraction of a cent per message, and it needs no extra vendor account. The PDF is built
 * on the fly from current data so the attachment can never drift from what's in the system.
 */
export async function sendInvoiceEmailAction(invoiceId: string): Promise<{ sentTo: string }> {
  const session = await requireInternalTeam();

  if (!isSesConfigured) {
    throw new Error("Email delivery isn't set up yet. Ask an admin to configure SES_FROM_ADDRESS.");
  }

  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (!invoice.clientEmail) {
    throw new Error(`${invoice.clientName} has no email address. Add one in CRM first.`);
  }

  const pdf = await buildDocumentPdf({
    kind: "INVOICE",
    number: invoice.number,
    status: invoice.status,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    clientPhone: invoice.clientPhone,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    secondaryDate: invoice.dueDate,
    items: invoice.items,
    footerNote: invoice.notes,
    serviceLabel: invoice.serviceLabel ?? invoice.items[0]?.description.split("\n")[0],
    engagement: invoice.engagement,
  });

  const total = invoice.items.reduce(
    (sum, i) => sum + i.quantity * i.rate - i.discount + i.tax,
    0
  );

  await sendEmail({
    to: invoice.clientEmail,
    // Replies go to the sender rather than the no-reply identity, so a client question reaches a human.
    replyTo: session.email,
    subject: `Invoice ${invoice.number} from ${agency.name}`,
    text: [
      `Hi ${invoice.clientName},`,
      "",
      `Please find invoice ${invoice.number} attached, for ${invoice.currency} ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
      `It is due on ${invoice.dueDate}.`,
      "",
      "Bank transfer details are on the invoice. Please quote the invoice number with your payment.",
      "",
      "Any questions, just reply to this email.",
      "",
      "Thanks,",
      `${session.name}`,
      agency.name,
    ].join("\n"),
    attachment: {
      filename: `${invoice.number}.pdf`,
      contentType: "application/pdf",
      content: pdf,
    },
  });

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "invoice",
    action: `Invoice ${invoice.number} emailed to ${invoice.clientEmail}`,
    entityId: invoice.id,
  });

  revalidatePath("/invoices");

  return { sentTo: invoice.clientEmail };
}
