import { query, isAwsDbConfigured } from "@/lib/aws/db";

// Cognito owns identity (sub, email, password), but app-level data (role, department, and
// every foreign key like clients.owner_id / project_tasks.assignee_id) needs a row in our own
// `users` table keyed by that same `sub`. This upserts that row the first time we see a given
// Cognito user — called right after a successful sign-in or sign-up (see
// src/app/actions/auth.ts). No-ops if Aurora isn't configured (mock/demo mode).
// Returns the user's role after the upsert. Deliberately does NOT touch `role` on conflict —
// only full_name/email refresh from Cognito — so a role an admin has assigned stays put across
// future sign-ins. New rows get the schema default ('developer'); promote via the Team page.
export async function upsertUserFromCognito(params: { id: string; email: string; name: string }): Promise<string> {
  if (!isAwsDbConfigured) return "admin"; // mock/demo mode: treat the local user as admin so role-gated UI is visible

  const rows = await query<{ role: string }>(
    `insert into users (id, full_name, email)
     values (:id, :name, :email)
     on conflict (id) do update set full_name = excluded.full_name, email = excluded.email
     returning role`,
    { id: params.id, name: params.name, email: params.email }
  );
  return rows[0]?.role ?? "developer";
}

export async function updateUserRole(userId: string, role: string) {
  if (!isAwsDbConfigured) return;
  await query(`update users set role = :role where id = :userId`, { role, userId });
}
