"use client";

import { Printer, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Split out from the (now server-side) invoice detail page since window.print() and the toast
// call need to run in the browser — everything else on that page can render server-side.
export function InvoiceDetailActions({ invoiceNumber, clientEmail }: { invoiceNumber: string; clientEmail?: string }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" /> Export PDF
      </Button>
      <Button size="sm" onClick={() => toast.success(`Emailed ${invoiceNumber} to ${clientEmail ?? "client"}`)}>
        <Send className="h-3.5 w-3.5" /> Send to Client
      </Button>
    </div>
  );
}
