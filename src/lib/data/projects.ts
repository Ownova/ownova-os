import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { projects as mockProjects, projectTasks as mockProjectTasks } from "@/lib/mock-data";
import type { Project, ProjectTask } from "@/types";

interface ProjectRow {
  id: string;
  name: string;
  client_id: string;
  client_name: string;
  status: string;
  budget: number;
  spent: number;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  description: string | null;
  team: string[] | null;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    clientName: row.client_name,
    status: row.status as Project["status"],
    budget: Number(row.budget),
    spent: Number(row.spent),
    startDate: row.start_date ?? "",
    dueDate: row.due_date ?? "",
    progress: row.progress,
    team: row.team ?? [],
    description: row.description ?? "",
  };
}

const PROJECT_SELECT = `
  select p.id, p.name, p.client_id, c.name as client_name, p.status, p.budget, p.spent,
         p.start_date, p.due_date, p.progress, p.description,
         coalesce(
           (select array_agg(u.full_name) from project_members pm
            join users u on u.id = pm.user_id where pm.project_id = p.id),
           '{}'
         ) as team
  from projects p
  join clients c on c.id = p.client_id`;

export async function getProjects(): Promise<Project[]> {
  if (!isAwsDbConfigured) return mockProjects;
  const rows = await query<ProjectRow>(`${PROJECT_SELECT} order by p.created_at desc`);
  return rows.map(rowToProject);
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  if (!isAwsDbConfigured) return mockProjects.find((p) => p.id === id);
  const rows = await query<ProjectRow>(`${PROJECT_SELECT} where p.id = :id`, { id });
  return rows[0] ? rowToProject(rows[0]) : undefined;
}

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  assignee_name: string | null;
  due_date: string | null;
  labels: string[] | null;
}

function rowToTask(row: TaskRow): ProjectTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: row.status as ProjectTask["status"],
    priority: row.priority as ProjectTask["priority"],
    assignee: row.assignee_name ?? "Unassigned",
    dueDate: row.due_date ?? "",
    labels: row.labels ?? [],
  };
}

/** All tasks across every project — used by the global Tasks page and Team workload counts. */
export async function getAllTasks(): Promise<ProjectTask[]> {
  if (!isAwsDbConfigured) return mockProjectTasks;
  const rows = await query<TaskRow>(
    `select t.id, t.project_id, t.title, t.status, t.priority, t.due_date, t.labels,
            u.full_name as assignee_name
     from project_tasks t
     left join users u on u.id = t.assignee_id
     order by t.created_at desc`
  );
  return rows.map(rowToTask);
}

export async function getProjectTasks(projectId: string): Promise<ProjectTask[]> {
  if (!isAwsDbConfigured) return mockProjectTasks.filter((t) => t.projectId === projectId);
  const rows = await query<TaskRow>(
    `select t.id, t.project_id, t.title, t.status, t.priority, t.due_date, t.labels,
            u.full_name as assignee_name
     from project_tasks t
     left join users u on u.id = t.assignee_id
     where t.project_id = :projectId
     order by t.created_at`,
    { projectId }
  );
  return rows.map(rowToTask);
}
