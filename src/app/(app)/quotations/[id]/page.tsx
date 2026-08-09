import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getQuotationById } from "@/lib/data/quotations";
import { getClientById } from "@/lib/data/clients";
import { QuotationDetailActions } from "@/components/quotations/quotation-detail-actions";
import { requireInternalPage } from "@/lib/auth-guard";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireInternalPage();

  const { id } = await params;
  const quotation = await getQuotationById(id);
  if (!quotation) return notFound();

  const client = await getClientById(quotation.clientId);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Quotations
        </Link>
        <QuotationDetailActions
          quotationId={quotation.id}
          quotationNumber={quotation.number}
          status={quotation.status}
        />
      </div>

      <Card>
        <CardContent className="space-y-6 p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-primary">Ownova</p>
              <p className="text-xs text-muted-foreground">Automating the Future, Empowering Businesses.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{quotation.number}</p>
              <Badge>{quotation.status}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Prepared For</p>
              <p className="font-medium">{quotation.clientName}</p>
              <p className="text-muted-foreground">{client?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-muted-foreground">Issued</p>
              <p>{formatDate(quotation.issueDate)}</p>
              <p className="mt-1 text-xs uppercase text-muted-foreground">Valid Until</p>
              <p>{formatDate(quotation.validUntil)}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotation.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.rate, quotation.currency)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.quantity * item.rate - item.discount, quotation.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto flex w-full max-w-xs justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(quotation.total, quotation.currency)}</span>
          </div>

          {quotation.terms && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="mb-1 text-xs uppercase">Terms &amp; Conditions</p>
              {quotation.terms}
            </div>
          )}

          <div className="border-t border-border pt-6">
            <p className="text-xs uppercase text-muted-foreground">Client Signature</p>
            <div className="mt-6 h-px w-56 bg-border" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
