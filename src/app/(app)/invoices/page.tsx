import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { getInvoices } from "@/lib/data/invoices";

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Invoicing</h1>
          <p className="text-sm text-muted-foreground">Create, send, and track every invoice.</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" /> New Invoice
          </Link>
        </Button>
      </div>
      <InvoiceTable invoices={invoices} />
    </div>
  );
}
