import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskBoard } from "@/components/projects/task-board";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { TaskPriority } from "@/types";
import { getAllTasks, getProjects } from "@/lib/data/projects";
import { getTeamMembers } from "@/lib/data/team";
import { NewTaskDialog } from "@/components/projects/new-task-dialog";
import { requireInternalPage } from "@/lib/auth-guard";

const priorityVariant: Record<TaskPriority, "secondary" | "default" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "warning",
  urgent: "destructive",
};

export default async function TasksPage() {
  await requireInternalPage();

  const [projectTasks, projects, teamMembers] = await Promise.all([getAllTasks(), getProjects(), getTeamMembers()]);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Every task across every project, in one place.</p>
        </div>
        <NewTaskDialog projects={projects} teamMembers={teamMembers} />
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <TaskBoard tasks={projectTasks} />
        </TabsContent>

        <TabsContent value="list">
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectTasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{projects.find((p) => p.id === t.projectId)?.name ?? "—"}</TableCell>
                    <TableCell>{t.assignee}</TableCell>
                    <TableCell><Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{t.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{formatDate(t.dueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
