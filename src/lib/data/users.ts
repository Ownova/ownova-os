import { query, isAwsDbConfigured } from "@/lib/aws/db";

// Emails that should land with a specific role the very first time they sign up, instead of
// the schema default ('developer'). Only applies on insert — once a row exists, role changes
// go through the Team page's role editor (admin/CEO only), not this list.
const BOOTSTRAP_ROLES: Record<string, string> = {
  "ownova.org@gmail.com": "admin",
  "syedown109@gmail.com": "ceo",
};

// Cognito owns identity (sub, email, password), but app-level data (role, department, and
// every foreign key like clients.owner_id / project_tasks.assignee_id) needs a row in our own
// `users` table keyed by that same `sub`. This upserts that row the first time we see a given
// Cognito user — called right after a successful sign-in or sign-up (see
// src/app/actions/auth.ts). No-ops if Aurora isn't configured (mock/demo mode).
// Returns the user's role after the upsert. Deliberately does NOT touch `role` on conflict —
// only full_name/email refresh from Cognito — so a role an admin has assigned stays put across
// future sign-ins. New rows get BOOTSTRAP_ROLES[email] if listed, else the schema default.
export async function upsertUserFromCognito(params: { id: string; email: string; name: string }): Promise<string> {
  if (!isAwsDbConfigured) return "admin"; // mock/demo mode: treat the local user as admin so role-gated UI is visible

  const bootstrapRole = BOOTSTRAP_ROLES[params.email.toLowerCase()];
  const rows = await query<{ role: string }>(
    bootstrapRole
      ? `insert into users (id, full_name, email, role)
         values (:id, :name, :email, :role)
         on conflict (id) do update set full_name = excluded.full_name, email = excluded.email
         returning role`
      : `insert into users (id, full_name, email)
         values (:id, :name, :email)
         on conflict (id) do update set full_name = excluded.full_name, email = excluded.email
         returning role`,
    bootstrapRole
      ? { id: params.id, name: params.name, email: params.email, role: bootstrapRole }
      : { id: params.id, name: params.name, email: params.email }
  );
  return rows[0]?.role ?? "developer";
}

/**
 * Looks up the authoritative role for a Cognito sub. Called on every authenticated request via
 * getServerSession, so it stays a single indexed primary-key lookup. Falls back to the least
 * privileged internal role when the row is missing (e.g. verified token, but the upsert hasn't
 * run yet) rather than assuming elevated access.
 */
export async function getUserRole(userId: string): Promise<string> {
  if (!isAwsDbConfigured) return "admin";
  const rows = await query<{ role: string }>(`select role from users where id = :userId`, { userId });
  return rows[0]?.role ?? "developer";
}

export async function updateUserRole(userId: string, role: string) {
  if (!isAwsDbConfigured) return;
  await query(`update users set role = :role where id = :userId`, { role, userId });
}
