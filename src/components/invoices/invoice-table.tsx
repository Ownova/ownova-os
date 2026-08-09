"use client";

import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { invoices } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

const statusVariant: Record<InvoiceStatus, "secondary" | "default" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  pending: "default",
  paid: "success",
  partially_paid: "warning",
  cancelled: "secondary",
  overdue: "destructive",
};

export function InvoiceTable() {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                  {inv.number}
                </Link>
              </TableCell>
              <TableCell>{inv.clientName}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[inv.status]}>{inv.status.replace("_", " ")}</Badge>
              </TableCell>
              <TableCell>{formatDate(inv.issueDate)}</TableCell>
              <TableCell>{formatDate(inv.dueDate)}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(inv.total, inv.currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
