import { DollarSign, TrendingDown, TrendingUp, Wallet, FileDown } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { MoneyStatCard } from "@/components/dashboard/money-stat-card";
import {
  toCurrencyTotals,
  subtractCurrencyTotals,
  formatCurrencyTotals,
  isMixedCurrency,
  type CurrencyTotals,
} from "@/lib/money";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { getRevenueByMonth } from "@/lib/data/dashboard";
import { getInvoices } from "@/lib/data/invoices";
import { getClients } from "@/lib/data/clients";
import { getProjects, getAllTasks } from "@/lib/data/projects";
import { getTeamMembers } from "@/lib/data/team";
import { requireInternalPage } from "@/lib/auth-guard";

export default async function ReportsPage() {
  await requireInternalPage();

  const [revenueByMonth, invoices, clients, projects, teamMembers, projectTasks] = await Promise.all([
    getRevenueByMonth(),
    getInvoices(),
    getClients(),
    getProjects(),
    getTeamMembers(),
    getAllTasks(),
  ]);
  // The revenue/expense chart is a single-series trend, so it stays numeric. Every headline
  // money figure below is grouped by currency instead of summed -- see lib/money.ts.
  const chartRevenue = revenueByMonth.reduce((s, m) => s + m.revenue, 0);
  const chartExpenses = revenueByMonth.reduce((s, m) => s + m.expenses, 0);

  const revenueTotals = toCurrencyTotals(
    invoices.filter((i) => i.status === "paid").map((i) => ({ currency: i.currency, amount: i.total }))
  );
  const outstandingTotals = toCurrencyTotals(
    invoices
      .filter((i) => ["pending", "overdue", "partially_paid"].includes(i.status))
      .map((i) => ({ currency: i.currency, amount: i.total }))
  );
  const expenseTotals: CurrencyTotals = { USD: chartExpenses };
  const profitTotals = subtractCurrencyTotals(revenueTotals, expenseTotals);

  // Client revenue is ranked by paid invoices, keeping each client's own currency.
  const revenueByClient = clients
    .map((c) => {
      const theirs = invoices.filter((i) => i.clientId === c.id);
      return {
        name: c.company,
        totals: toCurrencyTotals(theirs.map((i) => ({ currency: i.currency, amount: i.total }))),
        rank: theirs.reduce((s, i) => s + i.total, 0),
      };
    })
    .filter((r) => r.rank > 0)
    .sort((a, b) => b.rank - a.rank);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Revenue, profitability, and performance across the agency.</p>
        </div>
        {/* Was three dead buttons. Now one that works: CSV opens directly in Excel, Sheets and
            Numbers, so separate "Excel" and "PDF" exports were redundant and non-functional. */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/reports/csv" download>
              <FileDown className="h-3.5 w-3.5" /> Export CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyStatCard label="Revenue (paid)" totals={revenueTotals} icon={DollarSign} />
        <MoneyStatCard label="Total Expenses" totals={expenseTotals} icon={TrendingDown} />
        {/* Margin is undefined with no revenue (it rendered "NaN% margin" on a fresh account), and
            a loss must not be coloured as a positive trend. */}
        {/* Margin is only meaningful within one currency, so it is shown when the books are
            single-currency and omitted otherwise rather than mixing units. */}
        <MoneyStatCard
          label="Net Profit"
          totals={profitTotals}
          icon={TrendingUp}
          trend={
            !isMixedCurrency(revenueTotals) && chartRevenue > 0
              ? {
                  value: `${Math.round(((chartRevenue - chartExpenses) / chartRevenue) * 100)}% margin`,
                  positive: chartRevenue - chartExpenses >= 0,
                }
              : undefined
          }
        />
        <MoneyStatCard label="Outstanding" totals={outstandingTotals} icon={Wallet} />
      </div>

      <RevenueChart revenueByMonth={revenueByMonth} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-foreground text-base font-semibold">Revenue by Client</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByClient.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrencyTotals(r.totals).map((v) => (
                        <div key={v}>{v}</div>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-foreground text-base font-semibold">Employee Performance</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((m) => {
                  const assigned = projectTasks.filter((t) => t.assignee === m.name);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell className="text-right">{assigned.filter((t) => t.status === "done").length}</TableCell>
                      <TableCell className="text-right">{assigned.filter((t) => t.status !== "done").length}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-foreground text-base font-semibold">Project Profitability</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => {
                const margin = p.budget - p.spent;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.clientName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.budget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.spent)}</TableCell>
                    <TableCell className={`text-right font-medium ${margin < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {formatCurrency(margin)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
