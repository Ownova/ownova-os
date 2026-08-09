"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/app/actions/projects";
import { EmptyPrerequisite } from "@/components/ui/empty-prerequisite";
import type { Client } from "@/types";
import { describeActionError } from "@/lib/action-error";

export function NewProjectDialog({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await createProjectAction({
        clientId: String(form.get("clientId")),
        name: String(form.get("name")),
        description: String(form.get("description") || "") || undefined,
        budget: Number(form.get("budget") || 0),
        dueDate: String(form.get("dueDate") || "") || undefined,
      });
      toast.success("Project created");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(describeActionError(err, "Couldn't create project"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        {clients.length === 0 ? (
          <EmptyPrerequisite
            message="Every project belongs to a client, and there aren't any clients yet."
            actionLabel="Add a client first"
            actionHref="/crm"
          />
        ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client</Label>
            <select id="clientId" name="clientId" required className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm">
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Project Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget</Label>
              <Input id="budget" name="budget" type="number" step="0.01" min="0" defaultValue={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Project"}
          </Button>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
