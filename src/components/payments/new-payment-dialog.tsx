"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createPaymentAction } from "@/app/actions/expenses";
import type { Invoice } from "@/types";

const methods = ["bank_transfer", "stripe", "paypal", "wise", "payoneer", "cash"];
const statuses = ["paid", "pending", "partial", "refunded", "overdue"];

export function NewPaymentDialog({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await createPaymentAction({
        invoiceId: String(form.get("invoiceId")),
        amount: Number(form.get("amount") || 0),
        method: String(form.get("method")),
        status: String(form.get("status")),
        paidAt: String(form.get("paidAt") || "") || undefined,
      });
      toast.success("Payment logged");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't log payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Log Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invoiceId">Invoice</Label>
            <select id="invoiceId" name="invoiceId" required className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm">
              <option value="">Select invoice</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>{i.number} — {i.clientName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paidAt">Date</Label>
              <Input id="paidAt" name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="method">Method</Label>
              <select id="method" name="method" className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm">
                {methods.map((m) => (
                  <option key={m} value={m}>{m.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue="paid" className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm">
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Logging..." : "Log Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
