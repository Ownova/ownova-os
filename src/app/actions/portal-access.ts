"use server";

import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { requireRole } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";
import { revalidatePath } from "next/cache";

/**
 * Links a signed-up user to a client so they can see that client's portal, and sets their role
 * to "client".
 *
 * Restricted to admin/CEO: granting portal access hands an outside party visibility of real
 * billing data, which is not a routine action for every internal role.
 *
 * The user must already have signed up — access is granted to an existing, email-verified login
 * rather than created from an address, so nobody can be given access to data before they've
 * proven they control the mailbox.
 */
const PORTAL_ADMINS = ["admin", "ceo"];

export async function grantPortalAccessAction(email: string, clientId: string): Promise<void> {
  const session = await requireRole(PORTAL_ADMINS);
  if (!isAwsDbConfigured) return;

  const [user] = await query<{ id: string; full_name: string }>(
    `select id, full_name from users where lower(email) = lower(:email)`,
    { email: email.trim() }
  );
  if (!user) {
    throw new Error(
      `No account found for ${email}. Ask them to sign up at os.ownova.org/signup first, then try again.`
    );
  }

  const [client] = await query<{ name: string }>(`select name from clients where id = :clientId`, {
    clientId,
  });
  if (!client) throw new Error("That client no longer exists.");

  // One client per login keeps the scope unambiguous; re-granting moves them rather than
  // accumulating access to several clients.
  await query(`delete from client_portal_access where user_id = :userId`, { userId: user.id });
  await query(
    `insert into client_portal_access (user_id, client_id) values (:userId, :clientId)`,
    { userId: user.id, clientId }
  );
  await query(`update users set role = 'client'::user_role where id = :userId`, { userId: user.id });

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "client",
    action: `Portal access granted to ${email} for ${client.name}`,
    entityId: clientId,
  });

  revalidatePath("/crm");
  revalidatePath("/team");
}

export async function revokePortalAccessAction(userId: string): Promise<void> {
  const session = await requireRole(PORTAL_ADMINS);
  if (!isAwsDbConfigured) return;

  const [user] = await query<{ email: string }>(`select email from users where id = :userId`, {
    userId,
  });

  await query(`delete from client_portal_access where user_id = :userId`, { userId });

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "client",
    action: `Portal access revoked for ${user?.email ?? "a user"}`,
  });

  revalidatePath("/crm");
}
