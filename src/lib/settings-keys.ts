/**
 * Setting keys and types, deliberately in a module with NO "server-only" import.
 *
 * The settings form is a client component and needs these types. Importing them from a
 * server-only module fails the build ("you're importing a component that needs server-only"),
 * and a "use server" module can only export async functions — so neither of the obvious homes
 * works. Plain shared constants belong in their own module.
 */

/** Every key the UI is allowed to write, so an arbitrary key can't be injected into the table. */
export const ALLOWED_SETTING_KEYS = [
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

export type SettingKey = (typeof ALLOWED_SETTING_KEYS)[number];
export type SettingsMap = Partial<Record<SettingKey, string>>;
