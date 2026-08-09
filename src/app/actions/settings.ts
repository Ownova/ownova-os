"use server";

import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { requireRole } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

/**
 * Agency and finance settings, stored as key/value rows in `app_settings`.
 *
 * A key/value table rather than a wide `settings` table: these fields are a loose, evolving set
 * (branding, invoice defaults, payment instructions), and adding one shouldn't require a schema
 * migration. Both Save buttons on the Settings page previously did nothing at all.
 *
 * Restricted to admin/CEO — these values appear on client-facing invoices and drive finance
 * defaults, so they aren't something every internal role should be able to rewrite.
 */
const SETTINGS_ADMINS = ["admin", "ceo"];

/** Every key the UI is allowed to write, so an arbitrary key can't be injected into the table. */
const ALLOWED_KEYS = [
  "agency_name",
  "agency_email",
  "agency_tagline",
  "agency_address",
  "default_currency",
  "default_tax_rate",
  "invoice_number_format",
  "payment_terms_days",
  "payment_instructions",
] as const;

export type SettingKey = (typeof ALLOWED_KEYS)[number];
export type SettingsMap = Partial<Record<SettingKey, string>>;

export async function saveSettingsAction(values: SettingsMap): Promise<void> {
  const session = await requireRole(SETTINGS_ADMINS);
  if (!isAwsDbConfigured) return;

  const entries = Object.entries(values).filter(([key]) =>
    ALLOWED_KEYS.includes(key as SettingKey)
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

export async function getSettings(): Promise<SettingsMap> {
  if (!isAwsDbConfigured) return {};
  const rows = await query<{ key: string; value: string }>(`select key, value from app_settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as SettingsMap;
}
