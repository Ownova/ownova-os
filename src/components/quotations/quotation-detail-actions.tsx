"use client";

import { FileDown, FileText, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertQuotationToInvoiceAction, sendQuotationEmailAction } from "@/app/actions/quotations";
import { toastActionError } from "@/lib/action-toast";

/**
 * Export PDF downloads a real generated document, Send emails the quotation with that PDF
 * attached via SES (it used to just say email wasn't set up), and Convert to Invoice writes the
 * invoice + line items and marks the quotation accepted.
 */
export function QuotationDetailActions({
  quotationId,
  quotationNumber,
  status,
}: {
  quotationId: string;
  quotationNumber: string;
  status?: string;
}) {
  const router = useRouter();
  const [isConverting, startConverting] = useTransition();
  const [isSending, startSending] = useTransition();

  function sendToClient() {
    startSending(async () => {
      try {
        const { sentTo } = await sendQuotationEmailAction(quotationId);
        toast.success(`${quotationNumber} sent to ${sentTo}`);
        router.refresh();
      } catch (error) {
        toastActionError(error, "Could not send this quotation.");
      }
    });
  }

  function convertToInvoice() {
    startConverting(async () => {
      try {
        const { invoiceId, number } = await convertQuotationToInvoiceAction(quotationId);
        toast.success(`${quotationNumber} converted to draft invoice ${number}`);
        router.push(`/invoices/${invoiceId}`);
      } catch (error) {
        toastActionError(error, "Could not convert this quotation.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/quotations/${quotationId}/edit`}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        </Button>
      )}
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/quotations/${quotationId}/pdf`} download={`${quotationNumber}.pdf`}>
          <FileDown className="h-3.5 w-3.5" /> Export PDF
        </a>
      </Button>
      <Button variant="outline" size="sm" onClick={sendToClient} disabled={isSending}>
        <Send className="h-3.5 w-3.5" /> {isSending ? "Sending..." : "Send to Client"}
      </Button>
      <Button size="sm" onClick={convertToInvoice} disabled={isConverting}>
        <FileText className="h-3.5 w-3.5" /> {isConverting ? "Converting..." : "Convert to Invoice"}
      </Button>
    </div>
  );
}
