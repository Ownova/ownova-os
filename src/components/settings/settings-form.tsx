"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describeActionError } from "@/lib/action-error";
import { saveSettingsAction, type SettingsMap } from "@/app/actions/settings";

/**
 * Wraps a group of settings inputs and actually persists them. Reads values straight off the
 * form on submit rather than tracking each field in state — the inputs are uncontrolled with
 * defaultValue, so FormData is the simplest source of truth here.
 */
export function SettingsForm({
  children,
  disabled,
}: {
  children: React.ReactNode;
  /** True for roles that may view settings but not change them. */
  disabled?: boolean;
}) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const values: SettingsMap = {};
    for (const [key, value] of form.entries()) {
      values[key as keyof SettingsMap] = String(value);
    }

    setSaving(true);
    try {
      await saveSettingsAction(values);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(describeActionError(error, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="contents">
      {children}
      <div className="sm:col-span-2">
        <Button size="sm" type="submit" disabled={saving || disabled}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        {disabled && (
          <p className="mt-2 text-xs text-muted-foreground">
            Only admins and the CEO can change these settings.
          </p>
        )}
      </div>
    </form>
  );
}
