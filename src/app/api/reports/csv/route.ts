import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getInvoices } from "@/lib/data/invoices";
import { getRevenueByMonth } from "@/lib/data/dashboard";

/** RFC 4180 escaping: wrap in quotes and double any embedded quote. */
function csvCell(value: string | number): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Real CSV export for the Reports page (the button previously did nothing).
 *
 * CSV rather than XLSX: it opens natively in Excel, Sheets and Numbers, needs no extra
 * dependency, and streams as plain text — an .xlsx writer would add a sizeable package for a
 * format nothing here actually requires.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session || session.role === "client") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [invoices, revenueByMonth] = await Promise.all([getInvoices(), getRevenueByMonth()]);

  const lines: string[] = [];

  lines.push("Monthly Summary");
  lines.push(["Month", "Revenue", "Expenses", "Net"].map(csvCell).join(","));
  for (const month of revenueByMonth) {
    lines.push(
      [month.month, month.revenue, month.expenses, month.revenue - month.expenses].map(csvCell).join(",")
    );
  }

  lines.push("");
  lines.push("Invoices");
  lines.push(["Number", "Client", "Status", "Currency", "Issued", "Due", "Total"].map(csvCell).join(","));
  for (const invoice of invoices) {
    lines.push(
      [
        invoice.number,
        invoice.clientName,
        invoice.status,
        invoice.currency,
        invoice.issueDate,
        invoice.dueDate,
        invoice.total,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const filename = `ownova-report-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
