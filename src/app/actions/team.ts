"use server";

import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { updateUserRole } from "@/lib/data/users";
import { requireRole } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { revalidatePath } from "next/cache";

const ROLE_ADMINS = ["admin", "ceo"];

/**
 * The complete set of roles in the `user_role` enum. Validating against this allowlist keeps an
 * arbitrary string from ever reaching the database — the `::user_role` cast would reject it, but
 * relying on a SQL error for authorization control is fragile and produces a useless message.
 */
const VALID_ROLES = [
  "admin",
  "ceo",
  "manager",
  "sales",
  "marketing",
  "finance",
  "developer",
  "client",
] as const;

export async function updateUserRoleAction(userId: string, role: string) {
  const session = await requireRole(ROLE_ADMINS);

  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    throw new Error("That isn't a valid role.");
  }

  if (isAwsDbConfigured) {
    const [target] = await query<{ role: string; email: string }>(
      `select role, email from users where id = :userId`,
      { userId }
    );
    if (!target) throw new Error("That user no longer exists.");

    // Lockout protection: demoting the final admin/CEO would leave nobody able to manage roles,
    // and there's no way back through the UI — the fix would require direct database access.
    if (ROLE_ADMINS.includes(target.role) && !ROLE_ADMINS.includes(role)) {
      const [{ count }] = await query<{ count: number }>(
        `select count(*)::int as count from users where role in ('admin', 'ceo')`
      );
      if (count <= 1) {
        throw new Error(
          "This is the only admin account. Promote someone else before changing this role."
        );
      }
    }

    await updateUserRole(userId, role);

    await logActivity({
      actorId: session.mode === "cognito" ? session.sub : null,
      entityType: "task",
      action: `Role for ${target.email} changed from ${target.role} to ${role}`,
      entityId: userId,
    });
  }

  revalidatePath("/team");
}
