import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { ProjectTask, TaskStatus, TaskPriority } from "@/types";

const columns: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "done", label: "Done" },
];

const priorityVariant: Record<TaskPriority, "secondary" | "default" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "warning",
  urgent: "destructive",
};

export function TaskBoard({ tasks }: { tasks: ProjectTask[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((col) => {
        const items = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="rounded-xl bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{col.label}</h3>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((t) => (
                <div key={t.id} className="rounded-lg border border-border/70 bg-card p-3 shadow-sm">
                  <p className="text-sm font-medium leading-tight">{t.title}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{t.assignee}</p>
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">No tasks</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
