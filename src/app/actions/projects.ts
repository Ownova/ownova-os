"use server";

import { query } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { revalidatePath } from "next/cache";

export interface CreateProjectInput {
  clientId: string;
  name: string;
  description?: string;
  budget: number;
  dueDate?: string;
}

export async function createProjectAction(input: CreateProjectInput) {
  const session = await requireInternalTeam();

  await query(
    `insert into projects (client_id, name, description, status, budget, due_date)
     values (:clientId, :name, :description, 'planning', :budget, :dueDate)`,
    {
      clientId: input.clientId,
      name: input.name,
      description: input.description ?? null,
      budget: input.budget,
      dueDate: input.dueDate ?? null,
    }
  );

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "project",
    action: `Project created: ${input.name}`,
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
}

export async function createTaskAction(input: CreateTaskInput) {
  const session = await requireInternalTeam();

  await query(
    `insert into project_tasks (project_id, title, status, priority, assignee_id, due_date)
     values (:projectId, :title, 'todo', :priority::task_priority, :assigneeId, :dueDate)`,
    {
      projectId: input.projectId,
      title: input.title,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
    }
  );

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "task",
    action: `Task created: ${input.title}`,
    entityId: input.projectId,
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${input.projectId}`);
}
