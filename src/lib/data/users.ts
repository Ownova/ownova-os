import { query, isAwsDbConfigured } from "@/lib/aws/db";

// Cognito owns identity (sub, email, password), but app-level data (role, department, and
// every foreign key like clients.owner_id / project_tasks.assignee_id) needs a row in our own
// `users` table keyed by that same `sub`. This upserts that row the first time we see a given
// Cognito user — called right after a successful sign-in or sign-up (see
// src/app/actions/auth.ts). No-ops if Aurora isn't configured (mock/demo mode).
export async function upsertUserFromCognito(params: { id: string; email: string; name: string }) {
  if (!isAwsDbConfigured) return;

  await query(
    `insert into users (id, full_name, email)
     values (:id, :name, :email)
     on conflict (id) do update set full_name = excluded.full_name, email = excluded.email`,
    { id: params.id, name: params.name, email: params.email }
  );
}
