"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateUserRoleAction } from "@/app/actions/team";
import type { Role } from "@/types";

const ROLES: Role[] = ["admin", "ceo", "manager", "sales", "marketing", "finance", "developer", "client"];

export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: Role }) {
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value;
    startTransition(async () => {
      try {
        await updateUserRoleAction(userId, role);
        toast.success(`Role updated to ${role}`);
      } catch {
        toast.error("Couldn't update role — admin/CEO access required");
      }
    });
  }

  return (
    <select
      className="h-7 rounded-md border border-border bg-muted/40 px-2 text-xs disabled:opacity-50"
      value={currentRole}
      onChange={onChange}
      disabled={isPending}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
