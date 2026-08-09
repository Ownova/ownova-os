import { Wallet, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/types";
import { getPayments } from "@/lib/data/payments";
import { getInvoices } from "@/lib/data/invoices";

const statusVariant: Record<Payment["status"], "success" | "default" | "warning" | "secondary" | "destructive"> = {
  paid: "success",
  pending: "default",
  partial: "warning",
  refunded: "secondary",
  overdue: "destructive",
};

const methodLabel: Record<Payment["method"], string> = {
  bank_transfer: "Bank Transfer",
  stripe: "Stripe",
  paypal: "PayPal",
  wise: "Wise",
  payoneer: "Payoneer",
  cash: "Cash",
};

export default async function PaymentsPage() {
  const [payments, invoices] = await Promise.all([getPayments(), getInvoices()]);
  const collected = payments.filter((p) => p.status === "paid" || p.status === "partial").reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Payment Tracking</h1>
        <p className="text-sm text-muted-foreground">Every payment against every invoice, by method and status.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected" value={formatCurrency(collected)} icon={CheckCircle2} />
        <StatCard label="Pending" value={formatCurrency(pending)} icon={Clock} />
        <StatCard label="Overdue" value={formatCurrency(overdue)} icon={AlertTriangle} />
        <StatCard label="Refunded" value={formatCurrency(refunded)} icon={Wallet} />
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const invoice = invoices.find((i) => i.id === p.invoiceId);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{invoice?.number ?? "—"}</TableCell>
                  <TableCell>{invoice?.clientName ?? "—"}</TableCell>
                  <TableCell>{methodLabel[p.method]}</TableCell>
                  <TableCell><Badge variant={statusVariant[p.status]}>{p.status}</Badge></TableCell>
                  <TableCell>{formatDate(p.date)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.amount, invoice?.currency ?? "USD")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
