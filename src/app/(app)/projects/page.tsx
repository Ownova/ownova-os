import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectsKanban } from "@/components/projects/kanban-board";

export default function ProjectsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Every client engagement, tracked end to end.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>
      <ProjectsKanban />
    </div>
  );
}
