import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { getInvoices } from "@/lib/data/invoices";
import { requireInternalPage } from "@/lib/auth-guard";
import { markOverdueInvoices } from "@/lib/data/invoice-status";
import { generateDueRecurringInvoices } from "@/lib/data/recurring-invoices";

export default async function InvoicesPage() {
  await requireInternalPage();

  // Flip anything past its due date before reading, so the list never shows a stale
  // 'pending' on an invoice that lapsed days ago. Cheap: only touches wrong rows.
  await markOverdueInvoices().catch(() => {});
  // Retainers due this period appear as drafts. Failing here must not take the page down —
  // being unable to see your invoices is worse than a schedule running a day late.
  await generateDueRecurringInvoices().catch(() => {});
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
