import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { expenses as mockExpenses } from "@/lib/mock-data";
import type { Expense } from "@/types";

interface ExpenseRow {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  spent_on: string;
}

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    category: row.category,
    description: row.description ?? "",
    amount: Number(row.amount),
    date: row.spent_on,
  };
}

export async function getExpenses(): Promise<Expense[]> {
  if (!isAwsDbConfigured) return mockExpenses;
  const rows = await query<ExpenseRow>(
    `select id, category, description, amount, spent_on from expenses order by spent_on desc`
  );
  return rows.map(rowToExpense);
}
