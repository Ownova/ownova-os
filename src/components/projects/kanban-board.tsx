import Link from "next/link";
import { projects } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/types";

const columns: { key: ProjectStatus; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
];

export function ProjectsKanban() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
      {columns.map((col) => {
        const items = projects.filter((p) => p.status === col.key);
        return (
          <div key={col.key} className="w-72 shrink-0 rounded-xl bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{col.label}</h3>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-colors hover:border-primary/50"
                >
                  <p className="text-sm font-medium leading-tight">{p.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.clientName}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="secondary">{formatCurrency(p.budget)}</Badge>
                    <span className="text-xs text-muted-foreground">Due {formatDate(p.dueDate)}</span>
                  </div>
                </Link>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">No projects</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
