import Link from "next/link";
import { FileQuestion } from "lucide-react";

/** Replaces Next's default unstyled 404 so a mistyped or stale URL still looks like the product. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileQuestion className="h-5 w-5" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            This page doesn&apos;t exist, or the record it pointed to has been removed.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
