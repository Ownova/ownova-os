import { Plus, TrendingDown, Calendar, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExpenseChart } from "@/components/expenses/expense-chart";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { expenses } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ExpensesPage() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const categories = new Set(expenses.map((e) => e.category)).size;
  const largest = [...expenses].sort((a, b) => b.amount - a.amount)[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Expense Manager</h1>
          <p className="text-sm text-muted-foreground">Where the agency&apos;s money goes, by category and month.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Log Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total This Period" value={formatCurrency(total)} icon={TrendingDown} />
        <StatCard label="Categories" value={String(categories)} icon={Layers} />
        <StatCard label="Largest Expense" value={formatCurrency(largest.amount)} icon={Calendar} />
      </div>

      <ExpenseChart />

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell>{formatDate(e.date)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
