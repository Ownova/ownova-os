"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { toast } from "sonner";
import { toastActionError } from "@/lib/action-toast";
import { formatDate } from "@/lib/utils";
import { setInvoiceRecurrenceAction } from "@/app/actions/recurring";

/**
 * Turns a retainer into a repeating invoice. Copies are created as drafts and never emailed
 * automatically — that's stated on screen, because "recurring billing" is the sort of feature
 * people reasonably fear will mail a client without them knowing.
 */
const OPTIONS = [
  { value: "", label: "One-off — does not repeat" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Every 3 months" },
  { value: "yearly", label: "Yearly" },
];

export function RecurrenceControl({
  invoiceId,
  interval,
  nextAt,
  isGenerated,
}: {
  invoiceId: string;
  interval: string | null;
  nextAt: string | null;
  isGenerated: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(interval ?? "");
  const [isSaving, startSaving] = useTransition();

  if (isGenerated) {
    return (
      <div className="rounded-xl border border-border p-4 print:hidden">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Repeat className="h-3.5 w-3.5" /> Recurring
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          This invoice was generated automatically from a repeating schedule. Change the schedule on
          the original invoice.
        </p>
      </div>
    );
  }

  function save(next: string) {
    const previous = value;
    setValue(next);
    startSaving(async () => {
      try {
        await setInvoiceRecurrenceAction(invoiceId, next || null);
        toast.success(next ? `Repeats ${next}` : "Recurrence turned off");
        router.refresh();
      } catch (error) {
        setValue(previous);
        toastActionError(error, "Could not change the billing frequency.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border p-4 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Repeat className="h-3.5 w-3.5" /> Billing frequency
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {value && nextAt
              ? `Next invoice is created on ${formatDate(nextAt)}, as a draft for you to review.`
              : "Repeat this invoice on a schedule. Copies are always drafts — nothing is emailed automatically."}
          </p>
        </div>
        <select
          className="h-9 rounded-lg border border-border bg-muted/40 px-3 text-sm"
          value={value}
          disabled={isSaving}
          onChange={(event) => save(event.target.value)}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
