import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { agency } from "@/lib/agency";
import { amountInWords } from "@/lib/utils";
import type { InvoiceItem } from "@/types";

/**
 * Server-side PDF generation for invoices and quotations.
 *
 * Uses pdf-lib rather than a headless browser: Amplify's SSR runtime has no Chromium and the
 * bundle size of one would be prohibitive. pdf-lib is pure JS with no native dependencies, so it
 * runs anywhere the app runs. The trade-off is that layout is drawn manually rather than from
 * HTML/CSS, which is why this module owns the whole page composition.
 *
 * This deliberately mirrors the on-screen invoice at /invoices/[id]. The earlier version omitted
 * the agency's contact block, bank details, terms, and the amount in words — everything a client
 * actually needs in order to pay — so the downloaded document didn't match what staff saw and
 * couldn't be sent as-is.
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
// descriptions and notes, unsupported characters are replaced rather than allowed to fail the
// whole download.
function sanitize(text: string): string {
  return String(text ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

function money(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function lineTotal(item: InvoiceItem): number {
  return item.quantity * item.rate - item.discount + item.tax;
}

/** Truncates to fit a column, appending an ellipsis so silent cropping is visible. */
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const clean = sanitize(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let out = clean;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) out = out.slice(0, -1);
  return `${out}...`;
}

/** Greedy word wrap; returns the lines rather than drawing, so callers control pagination. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface DocumentPdfInput {
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
  /** e.g. "Growth Social Media Management Plan" — shown under the title. */
  serviceLabel?: string;
  engagement?: string;
}

const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;
const M = 46;
const BRAND = rgb(0.23, 0.51, 0.96);
const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.45, 0.45, 0.5);
const HAIRLINE = rgb(0.87, 0.87, 0.9);

export async function buildDocumentPdf(input: DocumentPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  // Deterministic output: pdf-lib stamps the current time into CreationDate/ModDate by default,
  // so two downloads of the same invoice would differ byte-for-byte. Pinning the metadata to the
  // document's own issue date means re-downloading an invoice always produces an identical file —
  // which matters when the same document is sent twice or archived for an audit.
  const issued = new Date(`${input.issueDate}T00:00:00Z`);
  const stamp = Number.isNaN(issued.getTime()) ? new Date(0) : issued;
  pdf.setTitle(`${input.kind === "INVOICE" ? "Invoice" : "Quotation"} ${input.number}`);
  pdf.setAuthor(agency.name);
  pdf.setProducer("Ownova OS");
  pdf.setCreator("Ownova OS");
  pdf.setCreationDate(stamp);
  pdf.setModificationDate(stamp);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;
  const contentW = PAGE_W - M * 2;
  const right = PAGE_W - M;

  const isInvoice = input.kind === "INVOICE";

  /** Starts a new page when the next block wouldn't fit above the bottom margin. */
  const ensure = (needed: number) => {
    if (y - needed < M) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
    }
  };
  const textRight = (t: string, font: PDFFont, size: number, yy: number, color = INK) =>
    page.drawText(t, { x: right - font.widthOfTextAtSize(t, size), y: yy, size, font, color });

  // ---- header: brand left, agency contact right ------------------------------------------
  page.drawText(agency.name, { x: M, y: y - 12, size: 20, font: bold, color: BRAND });
  page.drawText(sanitize(agency.tagline), { x: M, y: y - 26, size: 8, font: regular, color: MUTED });

  let hy = y - 2;
  for (const line of [`Phone: ${agency.phone}`, `Email: ${agency.email}`, `Address: ${agency.address}`]) {
    textRight(sanitize(line), regular, 8, hy, MUTED);
    hy -= 11;
  }

  y -= 48;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1, color: HAIRLINE });
  y -= 26;

  // ---- title + meta table -----------------------------------------------------------------
  page.drawText(input.kind, { x: M, y: y - 8, size: 26, font: bold, color: INK });
  if (input.serviceLabel) {
    page.drawText(fit(input.serviceLabel.toUpperCase(), regular, 8, 240), {
      x: M, y: y - 22, size: 8, font: regular, color: MUTED,
    });
  }

  const metaRows: [string, string][] = [
    [isInvoice ? "Invoice No." : "Quotation No.", input.number],
    [isInvoice ? "Invoice Date" : "Issue Date", input.issueDate],
    [isInvoice ? "Due Date" : "Valid Until", input.secondaryDate],
    ["Currency", input.currency],
    ["Status", input.status.replace(/_/g, " ").toUpperCase()],
  ];
  // Fixed-width meta block: labels right-aligned against a column, values right-aligned to the
  // page edge. Using constant column positions (rather than measuring each row) keeps the layout
  // identical for every document regardless of how long the values happen to be.
  const META_VALUE_W = 110;
  let my = y;
  for (const [label, value] of metaRows) {
    const labelRight = right - META_VALUE_W - 8;
    page.drawText(label, {
      x: labelRight - regular.widthOfTextAtSize(label, 8),
      y: my,
      size: 8,
      font: regular,
      color: MUTED,
    });
    textRight(fit(value, bold, 8, META_VALUE_W), bold, 8, my);
    my -= 13;
  }

  y = my - 14;

  // ---- billed to / billing period ---------------------------------------------------------
  const boxH = 62;
  const boxW = (contentW - 12) / 2;
  const drawBox = (x: number, title: string, lines: string[]) => {
    page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, borderColor: HAIRLINE, borderWidth: 1 });
    page.drawText(title, { x: x + 10, y: y - 16, size: 7, font: bold, color: MUTED });
    let ly = y - 30;
    lines.filter(Boolean).forEach((l, i) => {
      page.drawText(fit(l, i === 0 ? bold : regular, i === 0 ? 10 : 8, boxW - 20), {
        x: x + 10, y: ly, size: i === 0 ? 10 : 8, font: i === 0 ? bold : regular, color: i === 0 ? INK : MUTED,
      });
      ly -= i === 0 ? 13 : 10;
    });
  };

  drawBox(M, isInvoice ? "BILL TO" : "PREPARED FOR", [
    input.clientName,
    input.clientPhone ? `Phone: ${input.clientPhone}` : "",
    input.clientEmail ? `Email: ${input.clientEmail}` : "",
  ]);

  const period = new Date(input.issueDate).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  drawBox(M + boxW + 12, isInvoice ? "BILLING PERIOD" : "VALIDITY", [
    isInvoice ? period : `Until ${input.secondaryDate}`,
    input.serviceLabel ? `Service: ${input.serviceLabel}` : "",
    input.engagement ? `Engagement: ${input.engagement}` : "",
  ]);

  y -= boxH + 24;

  // ---- line items -------------------------------------------------------------------------
  const colQty = M + 300;
  const colRate = M + 350;

  page.drawLine({ start: { x: M, y: y + 12 }, end: { x: right, y: y + 12 }, thickness: 1, color: INK });
  page.drawText("DESCRIPTION", { x: M, y, size: 7, font: bold, color: INK });
  page.drawText("QTY", { x: colQty, y, size: 7, font: bold, color: INK });
  page.drawText(`RATE (${input.currency})`, { x: colRate, y, size: 7, font: bold, color: INK });
  textRight(`AMOUNT (${input.currency})`, bold, 7, y);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1, color: INK });
  y -= 16;

  for (const item of input.items) {
    // Descriptions may carry a title plus bullet detail lines, exactly as the page renders them.
    const [title, ...rest] = sanitize(item.description).split("\n");
    const detail = rest.flatMap((r) => wrap(r.replace(/^[-\s]+/, ""), regular, 7.5, 270));
    ensure(18 + detail.length * 10);

    page.drawText(fit(title, bold, 9, 280), { x: M, y, size: 9, font: bold, color: INK });
    page.drawText(String(item.quantity), { x: colQty, y, size: 9, font: regular, color: INK });
    page.drawText(item.rate.toLocaleString("en-US", { minimumFractionDigits: 2 }), {
      x: colRate, y, size: 9, font: regular, color: INK,
    });
    textRight((item.quantity * item.rate - item.discount).toLocaleString("en-US", { minimumFractionDigits: 2 }), bold, 9, y);
    y -= 12;

    for (const d of detail) {
      page.drawText(`- ${d}`, { x: M + 8, y, size: 7.5, font: regular, color: MUTED });
      y -= 10;
    }

    y -= 4;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 0.5, color: HAIRLINE });
    y -= 6;
  }

  // ---- totals -----------------------------------------------------------------------------
  const subtotal = input.items.reduce((s, i) => s + i.quantity * i.rate - i.discount, 0);
  const discount = input.items.reduce((s, i) => s + i.discount, 0);
  const tax = input.items.reduce((s, i) => s + i.tax, 0);
  const total = input.items.reduce((s, i) => s + lineTotal(i), 0);

  ensure(90);
  y -= 6;
  for (const [label, value] of [
    ["Subtotal", money(subtotal, input.currency)],
    ["Discount", money(discount, input.currency)],
    ["Tax", money(tax, input.currency)],
  ] as [string, string][]) {
    page.drawText(label, { x: colRate, y, size: 8, font: regular, color: MUTED });
    textRight(value, regular, 8, y);
    y -= 13;
  }

  // Total sits in a filled bar, mirroring the inverted "Total Due" row on screen.
  y -= 4;
  page.drawRectangle({ x: colRate - 10, y: y - 6, width: right - colRate + 10, height: 22, color: INK });
  page.drawText(isInvoice ? "Total Due" : "Total", { x: colRate, y, size: 10, font: bold, color: rgb(1, 1, 1) });
  const totalStr = money(total, input.currency);
  page.drawText(totalStr, {
    x: right - bold.widthOfTextAtSize(totalStr, 10) - 6, y, size: 10, font: bold, color: rgb(1, 1, 1),
  });
  y -= 30;

  // Amount in words — often required for the payment to be accepted.
  ensure(24);
  for (const line of wrap(amountInWords(total, input.currency), regular, 8, contentW)) {
    page.drawText(line, { x: M, y, size: 8, font: regular, color: MUTED });
    y -= 11;
  }
  y -= 10;

  // ---- payment details (invoices only) ----------------------------------------------------
  if (isInvoice) {
    ensure(90);
    page.drawRectangle({ x: M, y: y - 74, width: contentW, height: 74, borderColor: HAIRLINE, borderWidth: 1 });
    page.drawText("PAYMENT DETAILS", { x: M + 10, y: y - 16, size: 7, font: bold, color: MUTED });

    const bank: [string, string][] = [
      ["Bank Name", agency.bank.bankName],
      ["Account Title", agency.bank.accountTitle],
      ["Account Number", agency.bank.accountNumber],
      ["IBAN", agency.bank.iban],
      ["Swift Code", agency.bank.swiftCode],
      ["Branch", agency.bank.branch],
    ];
    const colW = contentW / 3;
    bank.forEach(([label, value], i) => {
      const cx = M + 10 + (i % 3) * colW;
      const cy = y - 32 - Math.floor(i / 3) * 22;
      page.drawText(label, { x: cx, y: cy, size: 6.5, font: regular, color: MUTED });
      page.drawText(fit(value, bold, 8, colW - 16), { x: cx, y: cy - 10, size: 8, font: bold, color: INK });
    });
    y -= 90;
  }

  // ---- terms + notes ----------------------------------------------------------------------
  const terms = isInvoice
    ? [
        "Payment is due within 7 days of the invoice date.",
        `Please quote invoice number ${input.number} with your payment.`,
        "Work commences upon receipt of payment confirmation.",
        "All bank charges are to be borne by the client.",
      ]
    : [];

  if (terms.length) {
    ensure(20 + terms.length * 11);
    page.drawText("TERMS & CONDITIONS", { x: M, y, size: 7, font: bold, color: MUTED });
    y -= 13;
    terms.forEach((t, i) => {
      page.drawText(`${i + 1}. ${sanitize(t)}`, { x: M, y, size: 7.5, font: regular, color: MUTED });
      y -= 11;
    });
    y -= 8;
  }

  if (input.footerNote) {
    const lines = wrap(input.footerNote, regular, 7.5, contentW);
    ensure(20 + lines.length * 10);
    page.drawText(isInvoice ? "NOTES" : "TERMS", { x: M, y, size: 7, font: bold, color: MUTED });
    y -= 13;
    for (const l of lines) {
      page.drawText(l, { x: M, y, size: 7.5, font: regular, color: MUTED });
      y -= 10;
    }
    y -= 8;
  }

  // ---- signature --------------------------------------------------------------------------
  ensure(46);
  page.drawText(isInvoice ? "Authorised Signature" : "Client Signature", {
    x: M, y, size: 7, font: bold, color: MUTED,
  });
  page.drawLine({ start: { x: M, y: y - 26 }, end: { x: M + 170, y: y - 26 }, thickness: 0.75, color: HAIRLINE });

  return pdf.save();
}
