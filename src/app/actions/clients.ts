"use server";

import { query } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { revalidatePath } from "next/cache";

export interface CreateClientInput {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  stage: string;
  value: number;
}

export async function createClientAction(input: CreateClientInput) {
  const session = await requireInternalTeam();

  let companyId: string | null = null;
  if (input.company) {
    const existing = await query<{ id: string }>(`select id from companies where name = :name limit 1`, {
      name: input.company,
    });
    companyId = existing[0]?.id ?? null;
    if (!companyId) {
      const created = await query<{ id: string }>(`insert into companies (name) values (:name) returning id`, {
        name: input.company,
      });
      companyId = created[0].id;
    }
  }

  await query(
    `insert into clients (name, company_id, email, phone, stage, value)
     values (:name, :companyId, :email, :phone, :stage, :value)`,
    {
      name: input.name,
      companyId,
      email: input.email ?? null,
      phone: input.phone ?? null,
      stage: input.stage,
      value: input.value,
    }
  );

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "client",
    action: `New client added: ${input.name}`,
  });

  revalidatePath("/crm");
  revalidatePath("/dashboard");
}
