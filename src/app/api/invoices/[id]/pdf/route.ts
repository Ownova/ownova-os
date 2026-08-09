import { NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/data/invoices";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";
import { getServerSession } from "@/lib/session";

/**
 * Streams a generated invoice PDF. Auth-gated: without this check the route would let anyone who
 * guessed an invoice UUID download a client's billing details, since route handlers sit outside
 * the (app) layout that protects the pages.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  // Internal staff only. A "client" role account is authenticated too, so checking merely
  // for a session would have let any signed-in client pull another client's billing document.
  if (!session || session.role === "client") return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const pdf = await buildDocumentPdf({
    kind: "INVOICE",
    number: invoice.number,
    status: invoice.status,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    clientPhone: invoice.clientPhone,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    secondaryDate: invoice.dueDate,
    items: invoice.items,
    footerNote: invoice.notes,
    serviceLabel: invoice.serviceLabel ?? invoice.items[0]?.description.split("\n")[0],
    engagement: invoice.engagement,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      // Billing documents can change (status, items) — never let a CDN or browser serve a stale copy.
      "Cache-Control": "no-store",
    },
  });
}
