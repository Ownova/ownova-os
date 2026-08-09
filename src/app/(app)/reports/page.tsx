import { DollarSign, TrendingDown, TrendingUp, Wallet, FileDown } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
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

export default async function ReportsPage() {
  const [revenueByMonth, invoices, clients, projects, teamMembers, projectTasks] = await Promise.all([
    getRevenueByMonth(),
    getInvoices(),
    getClients(),
    getProjects(),
    getTeamMembers(),
    getAllTasks(),
  ]);
  const revenue = revenueByMonth.reduce((s, m) => s + m.revenue, 0);
  const expenses = revenueByMonth.reduce((s, m) => s + m.expenses, 0);
  const profit = revenue - expenses;
  const outstanding = invoices
    .filter((i) => ["pending", "overdue", "partially_paid"].includes(i.status))
    .reduce((s, i) => s + i.total, 0);

  const revenueByClient = clients
    .map((c) => ({
      name: c.company,
      total: invoices.filter((i) => i.clientId === c.id).reduce((s, i) => s + i.total, 0),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Revenue, profitability, and performance across the agency.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileDown className="h-3.5 w-3.5" /> PDF</Button>
          <Button variant="outline" size="sm"><FileDown className="h-3.5 w-3.5" /> CSV</Button>
          <Button variant="outline" size="sm"><FileDown className="h-3.5 w-3.5" /> Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(revenue)} icon={DollarSign} />
        <StatCard label="Total Expenses" value={formatCurrency(expenses)} icon={TrendingDown} />
        <StatCard label="Net Profit" value={formatCurrency(profit)} icon={TrendingUp} trend={{ value: `${Math.round((profit / revenue) * 100)}% margin`, positive: true }} />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={Wallet} />
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
                    <TableCell className="text-right font-medium">{formatCurrency(r.total)}</TableCell>
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
