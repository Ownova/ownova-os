"use server";

import { query } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { revalidatePath } from "next/cache";

export interface CreateExpenseInput {
  category: string;
  description?: string;
  amount: number;
  spentOn: string;
}

export async function createExpenseAction(input: CreateExpenseInput) {
  const session = await requireInternalTeam();

  await query(
    `insert into expenses (category, description, amount, spent_on, created_by)
     values (:category, :description, :amount, :spentOn, :createdBy)`,
    {
      category: input.category,
      description: input.description ?? null,
      amount: input.amount,
      spentOn: input.spentOn,
      // mock mode's session.sub ("mock-user") isn't a real uuid — only pass it through for
      // real Cognito sessions, otherwise leave created_by null.
      createdBy: session.mode === "cognito" ? session.sub : null,
    }
  );

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export interface CreatePaymentInput {
  invoiceId: string;
  amount: number;
  method: string;
  status: string;
  paidAt?: string;
}

export async function createPaymentAction(input: CreatePaymentInput) {
  const session = await requireInternalTeam();

  await query(
    `insert into payments (invoice_id, amount, method, status, paid_at)
     values (:invoiceId, :amount, :method::payment_method, :status::payment_status, :paidAt)`,
    {
      invoiceId: input.invoiceId,
      amount: input.amount,
      method: input.method,
      status: input.status,
      paidAt: input.paidAt ?? null,
    }
  );

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "payment",
    action: `Payment of ${input.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })} recorded (${input.status})`,
    entityId: input.invoiceId,
  });

  revalidatePath("/payments");
  revalidatePath("/dashboard");
}
