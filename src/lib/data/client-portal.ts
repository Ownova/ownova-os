import "server-only";
import { query, isAwsDbConfigured } from "@/lib/aws/db";
import type { Invoice, InvoiceItem, Project, DocumentFile } from "@/types";

/**
 * Data for the client-facing portal, scoped to a single client.
 *
 * Every query here filters by `client_id` in SQL rather than fetching everything and filtering
 * in TypeScript. That distinction matters: a filter applied after the fact is a presentation
 * choice that a future refactor can quietly drop, whereas a WHERE clause means the rows for
 * other clients never leave the database.
 *
 * The link between a login and a client lives in `client_portal_access`. A user with no row
 * there sees nothing at all — access is granted explicitly, never inferred from a matching email
 * address, which would let anyone who signs up with a client's address inherit their data.
 */

export interface ClientPortalScope {
  clientId: string;
  clientName: string;
  company: string | null;
}

/** Resolves which client (if any) a signed-in user may view. Null means no access. */
export async function getPortalScope(userId: string): Promise<ClientPortalScope | null> {
  if (!isAwsDbConfigured) return null;

  const rows = await query<{ client_id: string; name: string; company: string | null }>(
    `select cpa.client_id, c.name, co.name as company
     from client_portal_access cpa
     join clients c on c.id = cpa.client_id
     left join companies co on co.id = c.company_id
     where cpa.user_id = :userId
     limit 1`,
    { userId }
  );

  const row = rows[0];
  if (!row) return null;
  return { clientId: row.client_id, clientName: row.name, company: row.company };
}

interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  currency: string;
  issue_date: string;
  due_date: string;
  paid: number | null;
  item_id: string | null;
  description: string | null;
  quantity: number | null;
  rate: number | null;
  discount: number | null;
  tax: number | null;
}

/**
 * Invoices for one client. Drafts are excluded deliberately — an unsent draft is internal
 * working state, and showing a client a figure the agency hasn't committed to invites disputes.
 */
export async function getPortalInvoices(clientId: string): Promise<Invoice[]> {
  if (!isAwsDbConfigured) return [];

  const rows = await query<InvoiceRow>(
    `select i.id, i.number, i.status::text as status, i.currency::text as currency,
            i.issue_date, i.due_date,
            coalesce((select sum(p.amount) from payments p
                      where p.invoice_id = i.id and p.status = 'paid'), 0) as paid,
            ii.id as item_id, ii.description, ii.quantity, ii.rate, ii.discount, ii.tax
     from invoices i
     left join invoice_items ii on ii.invoice_id = i.id
     where i.client_id = :clientId and i.status <> 'draft'
     order by i.issue_date desc, ii.id`,
    { clientId }
  );

  const byId = new Map<string, Invoice>();
  for (const row of rows) {
    let invoice = byId.get(row.id);
    if (!invoice) {
      invoice = {
        id: row.id,
        number: row.number,
        clientId,
        clientName: "",
        status: row.status as Invoice["status"],
        currency: row.currency as Invoice["currency"],
        issueDate: row.issue_date,
        // Clients see what they still owe, not just what was billed -- a payment they made last
        // week showing as an untouched balance is the fastest way to get a "did you receive it?"
        // email.
        paid: Number(row.paid ?? 0),
        dueDate: row.due_date,
        items: [],
        total: 0,
      };
      byId.set(row.id, invoice);
    }
    if (row.item_id) {
      const item: InvoiceItem = {
        id: row.item_id,
        description: row.description ?? "",
        quantity: Number(row.quantity ?? 0),
        rate: Number(row.rate ?? 0),
        discount: Number(row.discount ?? 0),
        tax: Number(row.tax ?? 0),
      };
      invoice.items.push(item);
      invoice.total += item.quantity * item.rate - item.discount + item.tax;
    }
  }
  return [...byId.values()];
}

export async function getPortalProjects(clientId: string): Promise<Project[]> {
  if (!isAwsDbConfigured) return [];

  const rows = await query<{
    id: string;
    name: string;
    status: string;
    budget: number;
    due_date: string | null;
    description: string | null;
  }>(
    `select id, name, status::text as status, budget, due_date, description
     from projects where client_id = :clientId order by created_at desc`,
    { clientId }
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    clientId,
    clientName: "",
    status: r.status as Project["status"],
    budget: Number(r.budget ?? 0),
    // Spend is internal margin information and is never exposed to the client.
    spent: 0,
    startDate: "",
    dueDate: r.due_date ?? "",
    progress: 0,
    team: [],
    description: r.description ?? "",
  }));
}

/**
 * Documents explicitly attached to this client. `owner_type = 'client'` is required: general
 * agency files (brand assets, internal contracts) must never surface in a client's portal.
 */
export async function getPortalDocuments(clientId: string): Promise<DocumentFile[]> {
  if (!isAwsDbConfigured) return [];

  const rows = await query<{
    id: string;
    name: string;
    folder: string;
    size_kb: number;
    version: number;
    created_at: string;
  }>(
    `select id, name, folder::text as folder, size_kb, version, created_at
     from documents
     where owner_type = 'client' and owner_id = :clientId
     order by created_at desc`,
    { clientId }
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    folder: r.folder as DocumentFile["folder"],
    sizeKb: r.size_kb,
    uploadedBy: "Ownova",
    uploadedAt: r.created_at,
    version: r.version,
  }));
}
