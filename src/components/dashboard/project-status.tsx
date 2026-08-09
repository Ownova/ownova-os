import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Project } from "@/types";

const statusVariant: Record<string, "default" | "success" | "warning" | "secondary"> = {
  in_progress: "default",
  review: "warning",
  completed: "success",
  planning: "secondary",
  on_hold: "secondary",
};

export function ProjectStatusCards({ projects }: { projects: Project[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-base font-semibold">Active Projects</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {projects.map((p) => (
          <div key={p.id} className="rounded-lg border border-border/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{p.name}</p>
              <Badge variant={statusVariant[p.status] ?? "secondary"}>{p.status.replace("_", " ")}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{p.clientName}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>{p.progress}% complete</span>
              <span>{formatCurrency(p.spent)} / {formatCurrency(p.budget)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
