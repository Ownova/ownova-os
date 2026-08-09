import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

/**
 * Shown in place of a form when the record it depends on doesn't exist yet -- e.g. logging a
 * payment requires an invoice, creating a project requires a client.
 *
 * Without this, those forms render a required <select> containing only the "Select ..."
 * placeholder. The dropdown looks broken: it opens to nothing, and submitting produces the
 * browser's generic "Please select an item in the list" tooltip, which explains neither what's
 * missing nor how to fix it. This states the prerequisite and links straight to it.
 */
export function EmptyPrerequisite({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm leading-snug text-muted-foreground">{message}</p>
      </div>
      <Link
        href={actionHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
