"use client";

import { FileDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * "Export PDF" downloads a real server-generated PDF from /api/invoices/[id]/pdf (previously this
 * called window.print(), which produced a screenshot of the page rather than a document).
 *
 * "Send to Client" is deliberately honest about not being wired up: it used to show a success
 * toast claiming the invoice had been emailed, which was untrue -- no mail transport is
 * configured. It now says so plainly instead.
 */
export function InvoiceDetailActions({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/invoices/${invoiceId}/pdf`} download={`${invoiceNumber}.pdf`}>
          <FileDown className="h-3.5 w-3.5" /> Export PDF
        </a>
      </Button>
      <Button
        size="sm"
        onClick={() =>
          toast.info("Email delivery isn't set up yet — download the PDF and send it manually for now.")
        }
      >
        <Send className="h-3.5 w-3.5" /> Send to Client
      </Button>
    </div>
  );
}
