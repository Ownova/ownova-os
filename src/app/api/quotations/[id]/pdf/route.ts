import { NextResponse } from "next/server";
import { getQuotationById } from "@/lib/data/quotations";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";
import { getServerSession } from "@/lib/session";

/** Streams a generated quotation PDF. Auth-gated for the same reason as the invoice route. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  // Internal staff only. A "client" role account is authenticated too, so checking merely
  // for a session would have let any signed-in client pull another client's billing document.
  if (!session || session.role === "client") return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const quotation = await getQuotationById(id);
  if (!quotation) return new NextResponse("Not found", { status: 404 });

  const pdf = await buildDocumentPdf({
    kind: "QUOTATION",
    number: quotation.number,
    status: quotation.status,
    clientName: quotation.clientName,
    currency: quotation.currency,
    issueDate: quotation.issueDate,
    secondaryDate: quotation.validUntil,
    items: quotation.items,
    footerNote: quotation.terms,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quotation.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
