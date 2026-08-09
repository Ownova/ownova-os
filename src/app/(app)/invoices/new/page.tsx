import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default function NewInvoicePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New Invoice</h1>
        <p className="text-sm text-muted-foreground">Auto-numbered, multi-currency, ready to send.</p>
      </div>
      <InvoiceForm />
    </div>
  );
}
