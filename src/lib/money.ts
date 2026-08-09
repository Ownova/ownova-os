import { formatCurrency } from "@/lib/utils";

/**
 * Money totals broken down by currency.
 *
 * The app invoices in USD, PKR, AED, EUR and GBP. Previously every figure on the dashboard and
 * reports simply added those amounts together and rendered the sum as dollars — so a PKR 300,000
 * invoice and a $1,000 invoice showed as "$301,000". For an accounting tool that isn't a display
 * quirk, it's a wrong number.
 *
 * Totals are kept per currency rather than converted, because converting requires a live FX rate
 * source, and a rate fetched today would silently restate last quarter's revenue tomorrow.
 * Showing "$4,200 · Rs 300,000" is both accurate and how a small agency actually thinks about
 * mixed books.
 */
export type CurrencyTotals = Record<string, number>;

/** Sums a list of {currency, amount} rows into a keyed total. */
export function toCurrencyTotals(rows: { currency: string; amount: number }[]): CurrencyTotals {
  const totals: CurrencyTotals = {};
  for (const row of rows) {
    if (!row.currency) continue;
    totals[row.currency] = (totals[row.currency] ?? 0) + Number(row.amount ?? 0);
  }
  return totals;
}

/** Adds two breakdowns together, e.g. combining several revenue sources. */
export function addCurrencyTotals(a: CurrencyTotals, b: CurrencyTotals): CurrencyTotals {
  const out: CurrencyTotals = { ...a };
  for (const [currency, amount] of Object.entries(b)) {
    out[currency] = (out[currency] ?? 0) + amount;
  }
  return out;
}

/** Subtracts b from a per currency — used for profit (revenue minus expenses). */
export function subtractCurrencyTotals(a: CurrencyTotals, b: CurrencyTotals): CurrencyTotals {
  const out: CurrencyTotals = { ...a };
  for (const [currency, amount] of Object.entries(b)) {
    out[currency] = (out[currency] ?? 0) - amount;
  }
  return out;
}

/**
 * Formats for display, largest first so the most material figure leads.
 *
 * Returns an array rather than a joined string so callers can lay the values out however suits
 * the surface (stacked in a stat card, inline in a table cell).
 */
export function formatCurrencyTotals(totals: CurrencyTotals, fallbackCurrency = "USD"): string[] {
  const entries = Object.entries(totals).filter(([, amount]) => amount !== 0);
  if (entries.length === 0) return [formatCurrency(0, fallbackCurrency)];
  return entries
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([currency, amount]) => formatCurrency(amount, currency));
}

/** True when more than one currency carries a non-zero amount. */
export function isMixedCurrency(totals: CurrencyTotals): boolean {
  return Object.values(totals).filter((amount) => amount !== 0).length > 1;
}
