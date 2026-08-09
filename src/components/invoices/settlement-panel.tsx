import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, Payment } from "@/types";

/**
 * Shows what's actually been collected against an invoice.
 *
 * Deliberately sits *outside* the invoice card and is hidden when printing: the invoice document
 * itself must render identically every time so the PDF matches the screen. Payment history is
 * internal working state, not part of the document the client receives.
 */
const methodLabel: Record<Payment["method"], string> = {
  bank_transfer: "Bank Transfer",
  stripe: "Stripe",
  paypal: "PayPal",
  wise: "Wise",
  payoneer: "Payoneer",
  cash: "Cash",
};

export function SettlementPanel({
  total,
  currency,
  payments,
  status,
}: {
  total: number;
  currency: Invoice["currency"];
  payments: Payment[];
  status: string;
}) {
  const settled = payments.filter((p) => p.status === "paid");
  const collected = settled.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = Math.max(0, total - collected);
  const pct = total > 0 ? Math.min(100, (collected / total) * 100) : 0;

  // Nothing collected and nothing pending — no panel worth showing.
  if (payments.length === 0 && status !== "overdue") return null;

  return (
    <div className="rounded-xl border border-border p-4 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Settlement
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{formatCurrency(collected, currency)}</span>
            <span className="text-muted-foreground"> collected of {formatCurrency(total, currency)}</span>
          </p>
        </div>
        <p className={`text-sm font-semibold ${outstanding <= 0.01 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
          {outstanding <= 0.01 ? "Fully settled" : `${formatCurrency(outstanding, currency)} outstanding`}
        </p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {payments.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {formatDate(p.date)} · {methodLabel[p.method] ?? p.method}
                {p.status !== "paid" && (
                  <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                    {p.status}
                  </span>
                )}
              </span>
              <span className={p.status === "paid" ? "font-medium" : "text-muted-foreground"}>
                {formatCurrency(p.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
