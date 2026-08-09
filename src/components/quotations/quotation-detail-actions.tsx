"use client";

import { FileDown, FileText, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertQuotationToInvoiceAction } from "@/app/actions/quotations";
import { describeActionError } from "@/lib/action-error";

/**
 * Export PDF now downloads a real generated document, and Convert to Invoice actually writes the
 * invoice + line items and marks the quotation accepted. Both previously only showed toasts.
 */
export function QuotationDetailActions({
  quotationId,
  quotationNumber,
}: {
  quotationId: string;
  quotationNumber: string;
}) {
  const router = useRouter();
  const [isConverting, startConverting] = useTransition();

  function convertToInvoice() {
    startConverting(async () => {
      try {
        const { invoiceId, number } = await convertQuotationToInvoiceAction(quotationId);
        toast.success(`${quotationNumber} converted to draft invoice ${number}`);
        router.push(`/invoices/${invoiceId}`);
      } catch (error) {
        toast.error(describeActionError(error, "Could not convert this quotation."));
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={`/api/quotations/${quotationId}/pdf`} download={`${quotationNumber}.pdf`}>
          <FileDown className="h-3.5 w-3.5" /> Export PDF
        </a>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          toast.info("Email delivery isn't set up yet — download the PDF and send it manually for now.")
        }
      >
        <Send className="h-3.5 w-3.5" /> Send
      </Button>
      <Button size="sm" onClick={convertToInvoice} disabled={isConverting}>
        <FileText className="h-3.5 w-3.5" /> {isConverting ? "Converting..." : "Convert to Invoice"}
      </Button>
    </div>
  );
}
