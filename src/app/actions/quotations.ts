"use server";

import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { nextInvoiceNumber } from "@/lib/data/invoices";
import { getQuotationById } from "@/lib/data/quotations";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";
import { sendEmail, isSesConfigured } from "@/lib/aws/ses";
import { agency } from "@/lib/agency";
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
     values (:clientId, :number, 'draft', :currency::currency_code, :issueDate, :validUntil, :terms)
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

export interface UpdateQuotationInput extends CreateQuotationInput {
  id: string;
}

/**
 * Rewrites a draft quotation.
 *
 * This is what makes the automated pipeline usable: a booking creates an empty draft, and after
 * the call you open it and type in the scope you just agreed. Without an edit path that draft is
 * a dead end.
 *
 * Only drafts are editable. Once a quotation has been sent, the client is holding a PDF with a
 * number on it — silently changing the figures behind that document is how disputes start. To
 * revise a sent quotation, issue a new one.
 *
 * Line items are replaced wholesale rather than diffed. The form submits the complete intended
 * state, and delete-then-insert cannot leave a stale row behind the way a partial update can.
 */
export async function updateQuotationAction(
  input: UpdateQuotationInput
): Promise<{ number: string; total: number }> {
  const session = await requireInternalTeam();

  const total = input.items.reduce((sum, i) => sum + i.quantity * i.rate - i.discount + i.tax, 0);
  if (!isAwsDbConfigured) return { number: "", total };

  const [existing] = await query<{ number: string; status: string }>(
    `select number, status from quotations where id = :id`,
    { id: input.id }
  );
  if (!existing) throw new Error("That quotation no longer exists.");
  if (existing.status !== "draft") {
    throw new Error(
      `${existing.number} has already been sent, so it can't be edited. Create a new quotation instead.`
    );
  }

  await query(
    `update quotations
        set client_id = :clientId,
            currency = :currency::currency_code,
            issue_date = :issueDate,
            valid_until = :validUntil,
            terms = :terms
      where id = :id`,
    {
      id: input.id,
      clientId: input.clientId,
      currency: input.currency,
      issueDate: input.issueDate,
      validUntil: input.validUntil,
      terms: input.terms ?? null,
    }
  );

  await query(`delete from quotation_items where quotation_id = :id`, { id: input.id });

  for (const item of input.items) {
    await query(
      `insert into quotation_items (quotation_id, description, quantity, rate, discount, tax)
       values (:quotationId, :description, :quantity, :rate, :discount, :tax)`,
      {
        quotationId: input.id,
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
    action: `Quotation ${existing.number} updated`,
    entityId: input.id,
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${input.id}`);
  revalidatePath("/dashboard");

  return { number: existing.number, total };
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
  // Guards against converting a pipeline-created draft that nobody has filled in yet — that
  // would produce a zero-value invoice and mark the quotation accepted on the strength of it.
  if (items.length === 0) {
    throw new Error("This quotation has no line items yet, so there's nothing to invoice.");
  }

  const number = await nextInvoiceNumber();
  const issueDate = new Date().toISOString().slice(0, 10);
  // Default to net-14 terms; the invoice is created as a draft so this can be edited before sending.
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const invoiceRows = await query<{ id: string }>(
    `insert into invoices (client_id, number, status, currency, issue_date, due_date, notes)
     values (:clientId, :number, 'draft', :currency::currency_code, :issueDate, :dueDate, :notes)
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

/**
 * Emails a quotation to the client with the PDF attached, and marks it "sent".
 *
 * Mirrors sendInvoiceEmailAction deliberately — the two documents go out through the same SES
 * path, with the same reply-to behaviour, so there's one place to reason about outbound mail.
 * The PDF is rebuilt at send time rather than reused from a cached copy, so what the client
 * receives always reflects the quotation as it stands right now.
 */
export async function sendQuotationEmailAction(quotationId: string): Promise<{ sentTo: string }> {
  const session = await requireInternalTeam();

  if (!isSesConfigured) {
    throw new Error("Email delivery isn't set up yet. Ask an admin to configure SES_FROM_ADDRESS.");
  }

  const quotation = await getQuotationById(quotationId);
  if (!quotation) throw new Error("Quotation not found.");
  if (!quotation.clientEmail) {
    throw new Error(`${quotation.clientName} has no email address. Add one in CRM first.`);
  }
  // Drafts created automatically when a call is booked start with no line items. Emailing one
  // would send the client a formal quotation for nothing at all.
  if (quotation.items.length === 0) {
    throw new Error(
      `${quotation.number} has no line items yet. Add the scope before sending it to the client.`
    );
  }

  const pdf = await buildDocumentPdf({
    kind: "QUOTATION",
    number: quotation.number,
    status: quotation.status,
    clientName: quotation.clientName,
    clientEmail: quotation.clientEmail,
    clientPhone: quotation.clientPhone,
    currency: quotation.currency,
    issueDate: quotation.issueDate,
    secondaryDate: quotation.validUntil,
    items: quotation.items,
    footerNote: quotation.terms,
    serviceLabel: quotation.items[0]?.description.split("\n")[0],
  });

  const total = quotation.items.reduce(
    (sum, i) => sum + i.quantity * i.rate - i.discount + i.tax,
    0
  );

  await sendEmail({
    to: quotation.clientEmail,
    replyTo: session.email,
    subject: `Quotation ${quotation.number} from ${agency.name}`,
    text: [
      `Hi ${quotation.clientName},`,
      "",
      `Thanks for your interest. Please find quotation ${quotation.number} attached, for ${quotation.currency} ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
      quotation.validUntil ? `It's valid until ${quotation.validUntil}.` : "",
      "",
      "If it all looks right, just reply to confirm and we'll get started.",
      "Happy to walk through anything on a call if that's easier.",
      "",
      "Thanks,",
      `${session.name}`,
      agency.name,
    ]
      .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
      .join("\n"),
    attachment: {
      filename: `${quotation.number}.pdf`,
      contentType: "application/pdf",
      content: pdf,
    },
  });

  // Only a draft moves to "sent" — an already accepted or declined quotation shouldn't be dragged
  // backwards just because someone re-sent the paperwork.
  if (isAwsDbConfigured && quotation.status === "draft") {
    // quotations.status is a plain text column, not an enum (unlike invoices.status) -- casting
    // to a quotation_status type here would fail at runtime.
    await query(`update quotations set status = 'sent' where id = :quotationId`, { quotationId });
  }

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    // The activity feed has no separate quotation entity; billing documents share the invoice icon.
    entityType: "invoice",
    action: `Quotation ${quotation.number} emailed to ${quotation.clientEmail}`,
    entityId: quotation.id,
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${quotationId}`);

  return { sentTo: quotation.clientEmail };
}
