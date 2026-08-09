"use server";

import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { requireRole } from "@/lib/auth-guard";
import { ALLOWED_SETTING_KEYS, type SettingKey, type SettingsMap } from "@/lib/settings-keys";
import { revalidatePath } from "next/cache";

/**
 * Persists agency/finance settings. Restricted to admin/CEO — these values appear on
 * client-facing invoices and drive finance defaults, so they aren't something every internal
 * role should be able to rewrite.
 *
 * Note this file exports exactly one thing, and it's an async function: a "use server" module
 * may not export types or constants, which is why those live in lib/data/settings.ts.
 */
const SETTINGS_ADMINS = ["admin", "ceo"];

export async function saveSettingsAction(values: SettingsMap): Promise<void> {
  const session = await requireRole(SETTINGS_ADMINS);
  if (!isAwsDbConfigured) return;

  const entries = Object.entries(values).filter(([key]) =>
    ALLOWED_SETTING_KEYS.includes(key as SettingKey)
  );

  for (const [key, value] of entries) {
    await query(
      `insert into app_settings (key, value, updated_by, updated_at)
       values (:key, :value, :updatedBy, now())
       on conflict (key) do update
         set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      {
        key,
        value: value ?? "",
        updatedBy: session.mode === "cognito" ? session.sub : null,
      }
    );
  }

  revalidatePath("/settings");
}
