"use client";

import { toast } from "sonner";
import { describeActionError, isVersionSkewError } from "@/lib/action-error";

/**
 * Single place every client component reports a failed Server Action.
 *
 * Version skew gets a persistent toast with a Reload button rather than a normal error: the
 * user's work is still in the form, an auto-reload would discard it, and a plain error message
 * gives them no way to recover. Everything else behaves as a standard error toast.
 */
export function toastActionError(error: unknown, fallback: string) {
  if (isVersionSkewError(error)) {
    toast.error("Ownova OS was just updated", {
      description: "Reload to get the latest version — your work is still on screen, so copy anything you need first.",
      duration: Infinity,
      action: {
        label: "Reload",
        onClick: () => window.location.reload(),
      },
    });
    return;
  }

  toast.error(describeActionError(error, fallback));
}
