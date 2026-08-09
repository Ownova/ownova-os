import { NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/data/invoices";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";
import { getServerSession } from "@/lib/session";
import { getPortalScope } from "@/lib/data/client-portal";

/**
 * Invoice PDF for a client's own invoice.
 *
 * Separate from the internal /api/invoices route because the authorisation rule is different:
 * staff may fetch any invoice, a client may fetch only their own. Ownership is re-checked here
 * against the session rather than trusted from the id in the URL — otherwise a client could
 * substitute another invoice's id and download someone else's billing details.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.role !== "client") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const scope = await getPortalScope(session.sub);
  if (!scope) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const invoice = await getInvoiceById(id);

  // Not-found rather than forbidden for someone else's invoice: confirming that an id exists but
  // belongs to another client would leak that the record is real.
  if (!invoice || invoice.clientId !== scope.clientId || invoice.status === "draft") {
    return new NextResponse("Not found", { status: 404 });
  }

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
      "Cache-Control": "no-store",
    },
  });
}
