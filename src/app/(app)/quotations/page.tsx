import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { QuotationStatus } from "@/types";
import { getQuotations } from "@/lib/data/quotations";
import { requireInternalPage } from "@/lib/auth-guard";

const statusVariant: Record<QuotationStatus, "secondary" | "default" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  sent: "default",
  accepted: "success",
  declined: "destructive",
  expired: "warning",
};

export default async function QuotationsPage() {
  await requireInternalPage();

  const quotations = await getQuotations();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">Proposals sent, accepted, and ready to convert into invoices.</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/quotations/new">
            <Plus className="h-4 w-4" /> New Quotation
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <Link href={`/quotations/${q.id}`} className="font-medium text-primary hover:underline">
                    {q.number}
                  </Link>
                </TableCell>
                <TableCell>{q.clientName}</TableCell>
                <TableCell><Badge variant={statusVariant[q.status]}>{q.status}</Badge></TableCell>
                <TableCell>{formatDate(q.issueDate)}</TableCell>
                <TableCell>{formatDate(q.validUntil)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(q.total, q.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
