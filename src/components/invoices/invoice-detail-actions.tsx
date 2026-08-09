"use client";

import { useTransition } from "react";
import { FileDown, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toastActionError } from "@/lib/action-toast";
import { sendInvoiceEmailAction } from "@/app/actions/invoices";

/**
 * "Export PDF" downloads a real server-generated PDF from /api/invoices/[id]/pdf.
 *
 * "Send to Client" now genuinely emails the invoice with the PDF attached, via SES. It previously
 * showed a success toast without sending anything.
 */
export function InvoiceDetailActions({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  const [isSending, startSending] = useTransition();

  function sendToClient() {
    startSending(async () => {
      try {
        const { sentTo } = await sendInvoiceEmailAction(invoiceId);
        toast.success(`${invoiceNumber} sent to ${sentTo}`);
      } catch (error) {
        toastActionError(error, "Could not send this invoice.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/invoices/${invoiceId}/pdf`} download={`${invoiceNumber}.pdf`}>
          <FileDown className="h-3.5 w-3.5" /> Export PDF
        </a>
      </Button>
      <Button size="sm" onClick={sendToClient} disabled={isSending}>
        <Send className="h-3.5 w-3.5" /> {isSending ? "Sending..." : "Send to Client"}
      </Button>
    </div>
  );
}
