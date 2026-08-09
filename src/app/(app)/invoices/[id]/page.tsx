"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { invoices, clients } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoice = invoices.find((i) => i.id === params.id);
  if (!invoice) return notFound();

  const client = clients.find((c) => c.id === invoice.clientId);
  const subtotal = invoice.items.reduce((sum, i) => sum + i.quantity * i.rate - i.discount, 0);
  const tax = invoice.items.reduce((sum, i) => sum + i.tax, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Export PDF
          </Button>
          <Button size="sm" onClick={() => toast.success(`Emailed ${invoice.number} to ${client?.email}`)}>
            <Send className="h-3.5 w-3.5" /> Send to Client
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-primary">Ownova</p>
              <p className="text-xs text-muted-foreground">Automating the Future, Empowering Businesses.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{invoice.number}</p>
              <Badge>{invoice.status.replace("_", " ")}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Billed To</p>
              <p className="font-medium">{invoice.clientName}</p>
              <p className="text-muted-foreground">{client?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-muted-foreground">Issue Date</p>
              <p>{formatDate(invoice.issueDate)}</p>
              <p className="mt-1 text-xs uppercase text-muted-foreground">Due Date</p>
              <p>{formatDate(invoice.dueDate)}</p>
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
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.rate, invoice.currency)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.quantity * item.rate - item.discount, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal, invoice.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(tax, invoice.currency)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span><span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{invoice.notes}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
