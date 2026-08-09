"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createTaskAction } from "@/app/actions/projects";
import type { Project, TeamMember } from "@/types";

const priorities = ["low", "medium", "high", "urgent"];

export function NewTaskDialog({ projects, teamMembers }: { projects: Project[]; teamMembers: TeamMember[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await createTaskAction({
        projectId: String(form.get("projectId")),
        title: String(form.get("title")),
        priority: String(form.get("priority")),
        assigneeId: String(form.get("assigneeId") || "") || undefined,
        dueDate: String(form.get("dueDate") || "") || undefined,
      });
      toast.success("Task created");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="projectId">Project</Label>
            <select id="projectId" name="projectId" required className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm">
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" name="priority" defaultValue="medium" className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm">
                {priorities.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assigneeId">Assignee</Label>
            <select id="assigneeId" name="assigneeId" className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm">
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
