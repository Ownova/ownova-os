"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createCalendarEventAction } from "@/app/actions/calendar";

const types = ["meeting", "deadline", "invoice_due", "task"];

export function NewEventDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await createCalendarEventAction({
        title: String(form.get("title")),
        eventDate: String(form.get("eventDate")),
        type: String(form.get("type")),
        relatedTo: String(form.get("relatedTo") || "") || undefined,
      });
      toast.success("Event added");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eventDate">Date</Label>
              <Input id="eventDate" name="eventDate" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" defaultValue="meeting" className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm">
                {types.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="relatedTo">Related To (optional)</Label>
            <Input id="relatedTo" name="relatedTo" placeholder="Client or project name" />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Adding..." : "Add Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
