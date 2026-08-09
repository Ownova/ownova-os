import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { clients as mockClients } from "@/lib/mock-data";
import type { Client } from "@/types";

// Data-access layer for the `clients` table. When Aurora isn't configured (local dev without
// AWS credentials), this transparently falls back to the in-memory mock data so every page
// that calls getClients() works either way — no component code needs to know which mode it's in.
//
// Note on auth context: these are plain query() calls, not withUserContext(). The RLS policy
// on `clients` is `using (is_internal_team())`, and is_internal_team() defaults to TRUE when no
// app.current_role session var is set (see db/migrations/0001_init.sql) — so unscoped reads are
// safe for internal-team pages like this one. Anything that must be scoped to a specific client
// (e.g. the client portal) should use withUserContext() instead — see src/lib/data/portal.ts.

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  value: number;
  owner_name: string | null;
  tags: string[] | null;
  last_activity_at: string | null;
  created_at: string;
  company_name: string | null;
}

function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    company: row.company_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    stage: row.stage as Client["stage"],
    value: Number(row.value),
    owner: row.owner_name ?? "Unassigned",
    tags: row.tags ?? [],
    lastActivity: row.last_activity_at ?? row.created_at,
    createdAt: row.created_at,
  };
}

export async function getClientById(id: string): Promise<Client | undefined> {
  if (!isAwsDbConfigured) return mockClients.find((c) => c.id === id);
  const rows = await query<ClientRow>(
    `select c.id, c.name, c.email, c.phone, c.stage, c.value, c.tags,
            c.last_activity_at, c.created_at,
            comp.name as company_name,
            u.full_name as owner_name
     from clients c
     left join companies comp on comp.id = c.company_id
     left join users u on u.id = c.owner_id
     where c.id = :id`,
    { id }
  );
  return rows[0] ? rowToClient(rows[0]) : undefined;
}

export async function getClients(): Promise<Client[]> {
  if (!isAwsDbConfigured) return mockClients;

  const rows = await query<ClientRow>(
    `select c.id, c.name, c.email, c.phone, c.stage, c.value, c.tags,
            c.last_activity_at, c.created_at,
            comp.name as company_name,
            u.full_name as owner_name
     from clients c
     left join companies comp on comp.id = c.company_id
     left join users u on u.id = c.owner_id
     order by c.created_at desc`
  );
  return rows.map(rowToClient);
}
