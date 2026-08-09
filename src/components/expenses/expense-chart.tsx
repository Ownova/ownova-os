"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Expense } from "@/types";

const palette = ["#2F6BFF", "#4C82FF", "#6B99FF", "#89AFFF", "#A7C5FF"];

export function ExpenseChart({ expenses }: { expenses: Expense[] }) {
  const byCategory = Object.values(
    expenses.reduce<Record<string, { category: string; amount: number }>>((acc, e) => {
      acc[e.category] = acc[e.category] ?? { category: e.category, amount: 0 };
      acc[e.category].amount += e.amount;
      return acc;
    }, {})
  ).sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-base font-semibold">Expenses by Category</CardTitle>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {byCategory.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
