"use server";

import { updateUserRole } from "@/lib/data/users";
import { requireRole } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

const ROLE_ADMINS = ["admin", "ceo"];

export async function updateUserRoleAction(userId: string, role: string) {
  await requireRole(ROLE_ADMINS);
  await updateUserRole(userId, role);
  revalidatePath("/team");
}
