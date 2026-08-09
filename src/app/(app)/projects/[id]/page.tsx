import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskBoard } from "@/components/projects/task-board";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getProjectById, getProjectTasks } from "@/lib/data/projects";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) return notFound();

  const tasks = await getProjectTasks(project.id);

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.clientName}</p>
        </div>
        <Badge>{project.status.replace("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Budget</CardTitle></CardHeader>
          <CardContent className="pt-0 text-lg font-semibold">{formatCurrency(project.budget)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Spent</CardTitle></CardHeader>
          <CardContent className="pt-0 text-lg font-semibold">{formatCurrency(project.spent)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
          <CardContent className="pt-0 text-lg font-semibold">{project.progress}%</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Due Date</CardTitle></CardHeader>
          <CardContent className="pt-0 text-lg font-semibold">{formatDate(project.dueDate)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-foreground text-base font-semibold">Overview</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-muted-foreground">{project.description}</p>
          <div className="flex items-center gap-2">
            {project.team.map((name) => (
              <div key={name} className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-xs">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
                </Avatar>
                {name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold">Tasks</h2>
        <TaskBoard tasks={tasks} />
      </div>
    </div>
  );
}
