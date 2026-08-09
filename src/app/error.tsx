"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Route-level error boundary. Without this, any uncaught render or data-fetching error shows
 * Next's raw error screen -- in production, an unexplained "Minified React error #xxx".
 *
 * The `digest` is the identifier Next assigns to the underlying server error; the real message
 * stays in CloudWatch. Showing it here is what lets a user report a specific failure without
 * exposing internals.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaces in the browser console and, for server-side failures, in CloudWatch logs.
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This page couldn&apos;t load. It may be a temporary problem — trying again often works.
            If it keeps happening, signing in again usually clears it.
          </p>
        </div>

        <div className="flex justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
          >
            Back to dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Reference code: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
