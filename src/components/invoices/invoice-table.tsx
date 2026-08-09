"use client";

import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Repeat } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";

const statusVariant: Record<InvoiceStatus, "secondary" | "default" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  pending: "default",
  paid: "success",
  partially_paid: "warning",
  cancelled: "secondary",
  overdue: "destructive",
};

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                  {inv.number}
                </Link>
                {inv.recurrence && (
                  <Repeat
                    className="ml-1.5 inline h-3 w-3 text-muted-foreground"
                    aria-label={`Repeats ${inv.recurrence}`}
                  />
                )}
              </TableCell>
              <TableCell>{inv.clientName}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[inv.status]}>{inv.status.replace("_", " ")}</Badge>
              </TableCell>
              <TableCell>{formatDate(inv.issueDate)}</TableCell>
              <TableCell>{formatDate(inv.dueDate)}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(inv.total, inv.currency)}</TableCell>
              <TableCell className="text-right">
                {(() => {
                  // What's still owed, not what was billed. An invoice with payments against it
                  // shows the remainder so the list answers "who owes us money" at a glance.
                  const outstanding = Math.max(0, inv.total - (inv.paid ?? 0));
                  if (inv.status === "cancelled") return <span className="text-muted-foreground">—</span>;
                  if (outstanding <= 0.01)
                    return <span className="font-medium text-emerald-600 dark:text-emerald-400">Settled</span>;
                  return (
                    <span className="font-medium">
                      {formatCurrency(outstanding, inv.currency)}
                      {(inv.paid ?? 0) > 0 && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          of {formatCurrency(inv.total, inv.currency)}
                        </span>
                      )}
                    </span>
                  );
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
