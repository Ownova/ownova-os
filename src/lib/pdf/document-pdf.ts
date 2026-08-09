import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { InvoiceItem } from "@/types";

/**
 * Server-side PDF generation for invoices and quotations.
 *
 * Uses pdf-lib rather than a headless browser: Amplify's SSR runtime has no Chromium and the
 * bundle size of one would be prohibitive. pdf-lib is pure JS with no native dependencies, so it
 * runs anywhere the app runs. The trade-off is that layout is drawn manually rather than from
 * HTML/CSS, which is why this module owns the whole page composition.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  PKR: "Rs ",
  AED: "AED ",
  EUR: "EUR ",
  GBP: "GBP ",
};

// pdf-lib's standard fonts are WinAnsi-encoded and throw on characters outside that set (emoji,
// smart quotes pasted from Word, non-Latin scripts). Since this text comes from user-entered
// descriptions and notes, unsupported characters are stripped rather than allowed to fail the
// whole download.
function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

function formatMoney(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function lineTotal(item: InvoiceItem): number {
  return item.quantity * item.rate - item.discount + item.tax;
}

/** Truncates to fit a column, appending an ellipsis so silent cropping is visible. */
function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const clean = sanitize(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let result = clean;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}

export interface DocumentPdfInput {
  /** "INVOICE" or "QUOTATION" — drives the heading and the date-label wording. */
  kind: "INVOICE" | "QUOTATION";
  number: string;
  status: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  currency: string;
  issueDate: string;
  /** Due date for invoices, valid-until for quotations. */
  secondaryDate: string;
  items: InvoiceItem[];
  /** Notes (invoice) or terms (quotation). */
  footerNote?: string;
}

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const BRAND = rgb(0.23, 0.51, 0.96);
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.45, 0.45, 0.5);

export async function buildDocumentPdf(input: DocumentPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  // --- header -------------------------------------------------------------------------------
  page.drawText("Ownova", { x: MARGIN, y: y - 10, size: 22, font: bold, color: BRAND });
  page.drawText("Automating the Future, Empowering Businesses.", {
    x: MARGIN,
    y: y - 26,
    size: 9,
    font: regular,
    color: MUTED,
  });

  const titleWidth = bold.widthOfTextAtSize(input.kind, 22);
  page.drawText(input.kind, { x: PAGE_WIDTH - MARGIN - titleWidth, y: y - 10, size: 22, font: bold, color: INK });
  const numberText = sanitize(input.number);
  const numberWidth = regular.widthOfTextAtSize(numberText, 11);
  page.drawText(numberText, {
    x: PAGE_WIDTH - MARGIN - numberWidth,
    y: y - 28,
    size: 11,
    font: regular,
    color: MUTED,
  });

  y -= 52;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.88, 0.88, 0.9),
  });
  y -= 28;

  // --- billed-to + dates --------------------------------------------------------------------
  page.drawText("BILLED TO", { x: MARGIN, y, size: 8, font: bold, color: MUTED });
  page.drawText(fitText(input.clientName, bold, 12, 240), { x: MARGIN, y: y - 16, size: 12, font: bold, color: INK });

  let contactY = y - 31;
  for (const contact of [input.clientEmail, input.clientPhone].filter(Boolean) as string[]) {
    page.drawText(fitText(contact, regular, 9, 240), { x: MARGIN, y: contactY, size: 9, font: regular, color: MUTED });
    contactY -= 12;
  }

  const rightX = PAGE_WIDTH - MARGIN - 180;
  const secondaryLabel = input.kind === "INVOICE" ? "DUE DATE" : "VALID UNTIL";
  const metaRows: [string, string][] = [
    ["ISSUE DATE", input.issueDate],
    [secondaryLabel, input.secondaryDate],
    ["STATUS", input.status.replace(/_/g, " ").toUpperCase()],
  ];

  let metaY = y;
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: rightX, y: metaY, size: 8, font: bold, color: MUTED });
    page.drawText(sanitize(value), { x: rightX + 90, y: metaY, size: 9, font: regular, color: INK });
    metaY -= 16;
  }

  y = Math.min(contactY, metaY) - 24;

  // --- line items ---------------------------------------------------------------------------
  const colDescX = MARGIN;
  const colQtyX = MARGIN + 260;
  const colRateX = MARGIN + 320;
  const colTotalRight = PAGE_WIDTH - MARGIN;

  page.drawRectangle({
    x: MARGIN,
    y: y - 6,
    width: contentWidth,
    height: 22,
    color: rgb(0.96, 0.96, 0.98),
  });
  page.drawText("DESCRIPTION", { x: colDescX + 6, y, size: 8, font: bold, color: MUTED });
  page.drawText("QTY", { x: colQtyX, y, size: 8, font: bold, color: MUTED });
  page.drawText("RATE", { x: colRateX, y, size: 8, font: bold, color: MUTED });
  const amountLabelWidth = bold.widthOfTextAtSize("AMOUNT", 8);
  page.drawText("AMOUNT", { x: colTotalRight - amountLabelWidth - 6, y, size: 8, font: bold, color: MUTED });
  y -= 28;

  const drawRow = (targetPage: PDFPage, item: InvoiceItem, rowY: number) => {
    targetPage.drawText(fitText(item.description, regular, 10, 240), {
      x: colDescX + 6,
      y: rowY,
      size: 10,
      font: regular,
      color: INK,
    });
    targetPage.drawText(String(item.quantity), { x: colQtyX, y: rowY, size: 10, font: regular, color: INK });
    targetPage.drawText(formatMoney(item.rate, input.currency), {
      x: colRateX,
      y: rowY,
      size: 10,
      font: regular,
      color: INK,
    });
    const amount = formatMoney(lineTotal(item), input.currency);
    const amountWidth = regular.widthOfTextAtSize(amount, 10);
    targetPage.drawText(amount, {
      x: colTotalRight - amountWidth - 6,
      y: rowY,
      size: 10,
      font: regular,
      color: INK,
    });
  };

  for (const item of input.items) {
    // Start a new page before running into the bottom margin, so long invoices don't lose rows.
    if (y < MARGIN + 120) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    drawRow(page, item, y);
    y -= 18;
    page.drawLine({
      start: { x: MARGIN, y: y + 6 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 6 },
      thickness: 0.5,
      color: rgb(0.92, 0.92, 0.94),
    });
    y -= 6;
  }

  // --- totals -------------------------------------------------------------------------------
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const discountTotal = input.items.reduce((sum, item) => sum + item.discount, 0);
  const taxTotal = input.items.reduce((sum, item) => sum + item.tax, 0);
  const grandTotal = input.items.reduce((sum, item) => sum + lineTotal(item), 0);

  y -= 10;
  const totalRows: [string, string, boolean][] = [
    ["Subtotal", formatMoney(subtotal, input.currency), false],
    ...(discountTotal > 0
      ? ([["Discount", `- ${formatMoney(discountTotal, input.currency)}`, false]] as [string, string, boolean][])
      : []),
    ...(taxTotal > 0
      ? ([["Tax", formatMoney(taxTotal, input.currency), false]] as [string, string, boolean][])
      : []),
    ["Total", formatMoney(grandTotal, input.currency), true],
  ];

  for (const [label, value, emphasised] of totalRows) {
    const font = emphasised ? bold : regular;
    const size = emphasised ? 13 : 10;
    const valueWidth = font.widthOfTextAtSize(value, size);
    page.drawText(label, { x: colRateX, y, size, font, color: emphasised ? INK : MUTED });
    page.drawText(value, { x: colTotalRight - valueWidth - 6, y, size, font, color: emphasised ? BRAND : INK });
    y -= emphasised ? 24 : 16;
  }

  // --- footer note --------------------------------------------------------------------------
  if (input.footerNote) {
    y -= 10;
    page.drawText(input.kind === "INVOICE" ? "NOTES" : "TERMS", {
      x: MARGIN,
      y,
      size: 8,
      font: bold,
      color: MUTED,
    });
    y -= 14;

    // Naive greedy wrap — enough for short notes, and avoids pulling in a text-layout dependency.
    const words = sanitize(input.footerNote).split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, 9) > contentWidth) {
        page.drawText(line, { x: MARGIN, y, size: 9, font: regular, color: INK });
        y -= 12;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) page.drawText(line, { x: MARGIN, y, size: 9, font: regular, color: INK });
  }

  return pdf.save();
}
