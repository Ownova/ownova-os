import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { invoices as mockInvoices, clients as mockClients } from "@/lib/mock-data";
import type { Invoice, InvoiceItem } from "@/types";

interface InvoiceItemRow {
  invoice_id: string;
  number: string;
  client_id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  status: string;
  currency: string;
  issue_date: string;
  due_date: string;
  notes: string | null;
  item_id: string | null;
  item_description: string | null;
  quantity: number | null;
  rate: number | null;
  discount: number | null;
  tax: number | null;
}

const INVOICE_SELECT = `
  select i.id as invoice_id, i.number, i.client_id, c.name as client_name,
         c.phone as client_phone, c.email as client_email,
         i.status, i.currency, i.issue_date, i.due_date, i.notes,
         ii.id as item_id, ii.description as item_description, ii.quantity, ii.rate, ii.discount, ii.tax
  from invoices i
  join clients c on c.id = i.client_id
  left join invoice_items ii on ii.invoice_id = i.id`;

function groupInvoiceRows(rows: InvoiceItemRow[]): Invoice[] {
  const byId = new Map<string, Invoice>();
  for (const row of rows) {
    let inv = byId.get(row.invoice_id);
    if (!inv) {
      inv = {
        id: row.invoice_id,
        number: row.number,
        clientId: row.client_id,
        clientName: row.client_name,
        clientPhone: row.client_phone ?? undefined,
        clientEmail: row.client_email ?? undefined,
        status: row.status as Invoice["status"],
        currency: row.currency as Invoice["currency"],
        issueDate: row.issue_date,
        dueDate: row.due_date,
        items: [],
        notes: row.notes ?? undefined,
        total: 0,
      };
      byId.set(row.invoice_id, inv);
    }
    if (row.item_id) {
      const item: InvoiceItem = {
        id: row.item_id,
        description: row.item_description ?? "",
        quantity: Number(row.quantity ?? 0),
        rate: Number(row.rate ?? 0),
        discount: Number(row.discount ?? 0),
        tax: Number(row.tax ?? 0),
      };
      inv.items.push(item);
      inv.total += item.quantity * item.rate - item.discount + item.tax;
    }
  }
  return Array.from(byId.values());
}

export async function getInvoices(): Promise<Invoice[]> {
  if (!isAwsDbConfigured) return mockInvoices;
  const rows = await query<InvoiceItemRow>(`${INVOICE_SELECT} order by i.created_at desc, ii.id`);
  return groupInvoiceRows(rows);
}

export async function getInvoiceById(id: string): Promise<Invoice | undefined> {
  if (!isAwsDbConfigured) {
    const invoice = mockInvoices.find((i) => i.id === id);
    if (!invoice) return undefined;
    // Mock invoices don't always carry clientPhone/clientEmail directly — fall back to the
    // matching mock client, same enrichment the real DB join provides automatically.
    const client = mockClients.find((c) => c.id === invoice.clientId);
    return {
      ...invoice,
      clientPhone: invoice.clientPhone ?? client?.phone,
      clientEmail: invoice.clientEmail ?? client?.email,
    };
  }
  const rows = await query<InvoiceItemRow>(`${INVOICE_SELECT} where i.id = :id order by ii.id`, { id });
  return groupInvoiceRows(rows)[0];
}

/** Next invoice number in the INV-{year}-{seq} format, based on how many invoices exist this year. */
export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  if (!isAwsDbConfigured) return `INV-${year}-${String(mockInvoices.length + 1).padStart(4, "0")}`;
  const rows = await query<{ count: number }>(
    `select count(*)::int as count from invoices where extract(year from issue_date) = :year`,
    { year }
  );
  return `INV-${year}-${String((rows[0]?.count ?? 0) + 1).padStart(4, "0")}`;
}
