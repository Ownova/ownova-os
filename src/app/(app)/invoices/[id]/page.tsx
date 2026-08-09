import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { agency } from "@/lib/agency";
import { formatCurrency, formatDate, amountInWords } from "@/lib/utils";
import { OwnovaMark } from "@/components/brand/logo";
import { getInvoiceById } from "@/lib/data/invoices";
import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions";
import { requireInternalPage } from "@/lib/auth-guard";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  paid: "Paid",
  partially_paid: "Partially Paid",
  cancelled: "Cancelled",
  overdue: "Overdue",
};

function billingPeriodLabel(issueDate: string) {
  return new Date(issueDate).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireInternalPage();

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) return notFound();

  const clientPhone = invoice.clientPhone;
  const clientEmail = invoice.clientEmail;
  const subtotal = invoice.items.reduce((sum, i) => sum + i.quantity * i.rate - i.discount, 0);
  const discount = invoice.items.reduce((sum, i) => sum + i.discount, 0);
  const tax = invoice.items.reduce((sum, i) => sum + i.tax, 0);
  const serviceLabel = invoice.serviceLabel ?? invoice.items[0]?.description.split("\n")[0] ?? "Professional Services";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
        </Link>
        <InvoiceDetailActions invoiceId={invoice.id} invoiceNumber={invoice.number} />
      </div>

      <Card>
        <CardContent className="space-y-6 p-8 text-sm">
          {/* Header: logo + agency details */}
          <div className="flex items-start justify-between border-b border-border pb-4">
            <OwnovaMark size={44} />
            <div className="text-right">
              <p className="text-base font-bold tracking-wide">{agency.name}</p>
              <p className="text-xs text-muted-foreground">{agency.tagline}</p>
              <p className="mt-1 text-xs text-muted-foreground">Phone: {agency.phone}</p>
              <p className="text-xs text-muted-foreground">Email: {agency.email}</p>
              <p className="text-xs text-muted-foreground">Address: {agency.address}</p>
            </div>
          </div>

          {/* Title + meta */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-bold tracking-wide">INVOICE</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{serviceLabel}</p>
            </div>
            <table className="text-xs">
              <tbody>
                <tr>
                  <td className="pr-4 text-right text-muted-foreground">Invoice No.</td>
                  <td className="font-semibold">{invoice.number}</td>
                </tr>
                <tr>
                  <td className="pr-4 text-right text-muted-foreground">Invoice Date</td>
                  <td className="font-semibold">{formatDate(invoice.issueDate)}</td>
                </tr>
                <tr>
                  <td className="pr-4 text-right text-muted-foreground">Due Date</td>
                  <td className="font-semibold">{formatDate(invoice.dueDate)}</td>
                </tr>
                <tr>
                  <td className="pr-4 text-right text-muted-foreground">Currency</td>
                  <td className="font-semibold">{invoice.currency}</td>
                </tr>
                <tr>
                  <td className="pr-4 text-right text-muted-foreground">Status</td>
                  <td className="font-semibold">{statusLabel[invoice.status]}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bill to / billing period */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bill To</p>
              <p className="mt-1 font-medium">{invoice.clientName}</p>
              {clientPhone && <p className="text-xs text-muted-foreground">Phone: {clientPhone}</p>}
              {clientEmail && <p className="text-xs text-muted-foreground">Email: {clientEmail}</p>}
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Billing Period</p>
              <p className="mt-1 font-medium">{billingPeriodLabel(invoice.issueDate)}</p>
              <p className="text-xs text-muted-foreground">Service: {serviceLabel}</p>
              {invoice.engagement && <p className="text-xs text-muted-foreground">Engagement: {invoice.engagement}</p>}
            </div>
          </div>

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/80 text-left text-xs uppercase tracking-widest">
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Rate ({invoice.currency})</th>
                <th className="py-2 text-right font-semibold">Amount ({invoice.currency})</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => {
                const [title, ...rest] = item.description.split("\n");
                return (
                  <tr key={item.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{title}</p>
                      {rest.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {rest.map((line, i) => (
                            <li key={i}>{line.startsWith("•") ? line : `• ${line}`}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">{item.rate.toLocaleString()}</td>
                    <td className="py-3 text-right font-medium">
                      {(item.quantity * item.rate - item.discount).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="ml-auto w-full max-w-xs space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{invoice.currency} {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Discount</span>
              <span>{invoice.currency} {discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tax</span>
              <span>{invoice.currency} {tax.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-foreground px-3 py-2 text-sm font-bold text-background">
              <span>Total Due</span>
              <span>{invoice.currency} {invoice.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment details */}
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment Details</p>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Bank Name</p>
                <p className="font-medium">{agency.bank.bankName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account Title</p>
                <p className="font-medium">{agency.bank.accountTitle}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account Number</p>
                <p className="font-medium">{agency.bank.accountNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">IBAN</p>
                <p className="font-medium">{agency.bank.iban}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Swift Code</p>
                <p className="font-medium">{agency.bank.swiftCode}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Branch</p>
                <p className="font-medium">{agency.bank.branch}</p>
              </div>
            </div>
          </div>

          {/* Terms + notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Terms &amp; Conditions</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Payment is due within 7 days of the invoice date.</li>
                <li>Please quote invoice number {invoice.number} with your payment.</li>
                <li>Work commences upon receipt of payment confirmation.</li>
                <li>All bank charges are to be borne by the client.</li>
              </ol>
            </div>
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notes</p>
                <p className="mt-1 text-xs text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Total in words */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-foreground px-4 py-3 text-background">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-70">Total Amount Due</p>
              <p className="text-xs">{amountInWords(invoice.total, invoice.currency)}</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(invoice.total, invoice.currency)}</p>
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="font-medium">Thank you for your business.</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {agency.name} — {agency.tagline}
              </p>
            </div>
            <div className="text-center">
              <div className="mb-1 h-8 w-40 border-b border-border" />
              <p className="text-xs text-muted-foreground">Authorised Signature</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            This is a computer-generated invoice and is valid without a physical signature. · {agency.name} · {agency.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
