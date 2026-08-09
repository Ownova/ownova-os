import { ProjectsKanban } from "@/components/projects/kanban-board";
import { getProjects } from "@/lib/data/projects";
import { getClients } from "@/lib/data/clients";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { requireInternalPage } from "@/lib/auth-guard";

export default async function ProjectsPage() {
  await requireInternalPage();

  const [projects, clients] = await Promise.all([getProjects(), getClients()]);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Every client engagement, tracked end to end.</p>
        </div>
        <NewProjectDialog clients={clients} />
      </div>
      <ProjectsKanban projects={projects} />
    </div>
  );
}
