import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { quotations as mockQuotations } from "@/lib/mock-data";
import type { InvoiceItem, Quotation } from "@/types";

interface QuotationItemRow {
  quotation_id: string;
  number: string;
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  status: string;
  currency: string;
  issue_date: string;
  valid_until: string | null;
  terms: string | null;
  item_id: string | null;
  item_description: string | null;
  quantity: number | null;
  rate: number | null;
  discount: number | null;
  tax: number | null;
}

const QUOTATION_SELECT = `
  select q.id as quotation_id, q.number, q.client_id, c.name as client_name,
         c.email as client_email, c.phone as client_phone,
         q.status, q.currency, q.issue_date, q.valid_until, q.terms,
         qi.id as item_id, qi.description as item_description, qi.quantity, qi.rate, qi.discount, qi.tax
  from quotations q
  join clients c on c.id = q.client_id
  left join quotation_items qi on qi.quotation_id = q.id`;

function groupQuotationRows(rows: QuotationItemRow[]): Quotation[] {
  const byId = new Map<string, Quotation>();
  for (const row of rows) {
    let q = byId.get(row.quotation_id);
    if (!q) {
      q = {
        id: row.quotation_id,
        number: row.number,
        clientId: row.client_id,
        clientName: row.client_name,
        clientEmail: row.client_email ?? undefined,
        clientPhone: row.client_phone ?? undefined,
        status: row.status as Quotation["status"],
        currency: row.currency as Quotation["currency"],
        issueDate: row.issue_date,
        validUntil: row.valid_until ?? "",
        items: [],
        terms: row.terms ?? undefined,
        total: 0,
      };
      byId.set(row.quotation_id, q);
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
      q.items.push(item);
      q.total += item.quantity * item.rate - item.discount + item.tax;
    }
  }
  return Array.from(byId.values());
}

export async function getQuotations(): Promise<Quotation[]> {
  if (!isAwsDbConfigured) return mockQuotations;
  const rows = await query<QuotationItemRow>(`${QUOTATION_SELECT} order by q.created_at desc, qi.id`);
  return groupQuotationRows(rows);
}

export async function getQuotationById(id: string): Promise<Quotation | undefined> {
  if (!isAwsDbConfigured) return mockQuotations.find((q) => q.id === id);
  const rows = await query<QuotationItemRow>(`${QUOTATION_SELECT} where q.id = :id order by qi.id`, { id });
  return groupQuotationRows(rows)[0];
}
