"use client";

import { FileText, Printer, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function QuotationDetailActions({
  quotationNumber,
  clientEmail,
}: {
  quotationNumber: string;
  clientEmail?: string;
}) {
  const router = useRouter();

  function convertToInvoice() {
    // Demo: a real "convert" would insert into `invoices` + `invoice_items` copying these
    // lines and mark the quotation accepted — wire that up alongside the invoice create action
    // in src/app/actions/invoices.ts when this becomes a priority.
    toast.success(`${quotationNumber} converted to a draft invoice`);
    router.push("/invoices");
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" /> Export PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => toast.success(`Sent to ${clientEmail ?? "client"}`)}>
        <Send className="h-3.5 w-3.5" /> Send
      </Button>
      <Button size="sm" onClick={convertToInvoice}>
        <FileText className="h-3.5 w-3.5" /> Convert to Invoice
      </Button>
    </div>
  );
}
