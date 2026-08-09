"use server";

import { query } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export interface CreateProjectInput {
  clientId: string;
  name: string;
  description?: string;
  budget: number;
  dueDate?: string;
}

export async function createProjectAction(input: CreateProjectInput) {
  await requireInternalTeam();

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
  await requireInternalTeam();

  await query(
    `insert into project_tasks (project_id, title, status, priority, assignee_id, due_date)
     values (:projectId, :title, 'todo', :priority, :assigneeId, :dueDate)`,
    {
      projectId: input.projectId,
      title: input.title,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
    }
  );

  revalidatePath("/tasks");
  revalidatePath(`/projects/${input.projectId}`);
}
