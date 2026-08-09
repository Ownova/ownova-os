import "server-only";
import { query, isAwsDbConfigured } from "@/lib/aws/db";
import type { SettingsMap } from "@/lib/settings-keys";

/**
 * Agency and finance settings, stored as key/value rows in `app_settings`.
 *
 * A key/value table rather than a wide `settings` table: these fields are a loose, evolving set
 * (branding, invoice defaults, payment instructions), and adding one shouldn't require a schema
 * migration. The keys and types live in lib/settings-keys.ts because the client-side form needs
 * them and cannot import a server-only module.
 */
export async function getSettings(): Promise<SettingsMap> {
  if (!isAwsDbConfigured) return {};
  const rows = await query<{ key: string; value: string }>(`select key, value from app_settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as SettingsMap;
}
