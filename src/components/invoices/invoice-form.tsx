"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { EmptyPrerequisite } from "@/components/ui/empty-prerequisite";
import { toastActionError } from "@/lib/action-toast";
import { createInvoiceAction } from "@/app/actions/invoices";
import type { Client } from "@/types";

const itemSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.coerce.number().min(1),
  rate: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
});

const schema = z.object({
  clientId: z.string().min(1, "Select a client"),
  currency: z.enum(["USD", "PKR", "AED", "EUR", "GBP"]),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof schema>;

export function InvoiceForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: "USD",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      items: [{ description: "", quantity: 1, rate: 0, discount: 0, tax: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const currency = watch("currency");

  const total = items.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.rate || 0);
    const afterDiscount = lineTotal - (item.discount || 0);
    return sum + afterDiscount + (item.tax || 0);
  }, 0);

  async function onSubmit(values: FormValues) {
    // Previously unguarded: if the action failed, the rejection went unhandled and the user got
    // no feedback at all -- the button simply stopped spinning.
    try {
      const result = await createInvoiceAction(values);
      toast.success(`${result.number} created for ${formatCurrency(result.total, values.currency)}`);
      router.push("/invoices");
    } catch (error) {
      toastActionError(error, "Could not create this invoice.");
    }
  }

  // An invoice must be addressed to a client. Rendering the form with an empty client dropdown
  // would let someone fill in every line item before discovering they can't submit.
  if (clients.length === 0) {
    return (
      <EmptyPrerequisite
        message="An invoice has to be addressed to a client, and there aren't any clients yet."
        actionLabel="Add a client first"
        actionHref="/crm"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="text-foreground text-base font-semibold">Invoice Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Client</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm"
              {...register("clientId")}
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <select className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm" {...register("currency")}>
              {["USD", "PKR", "AED", "EUR", "GBP"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Issue Date</Label>
            <Input type="date" {...register("issueDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" {...register("dueDate")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-foreground text-base font-semibold">Line Items</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({ description: "", quantity: 1, rate: 0, discount: 0, tax: 0 })}
          >
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-12 sm:items-end">
              <div className="space-y-1 sm:col-span-5">
                <Label className="text-xs">Description</Label>
                <Input {...register(`items.${index}.description`)} placeholder="Service or product" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input type="number" step="1" {...register(`items.${index}.quantity`)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Rate</Label>
                <Input type="number" step="0.01" {...register(`items.${index}.rate`)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Discount</Label>
                <Input type="number" step="0.01" {...register(`items.${index}.discount`)} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {errors.items && <p className="text-xs text-destructive">{errors.items.message as string}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-foreground text-base font-semibold">Notes & Total</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-1.5">
            <Label>Notes / Payment Instructions</Label>
            <Textarea placeholder="Thank you for your business..." {...register("notes")} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Grand Total</span>
            <span className="text-lg font-semibold">{formatCurrency(total, currency)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/invoices")}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Invoice"}</Button>
      </div>
    </form>
  );
}
