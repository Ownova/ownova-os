import { ShieldAlert } from "lucide-react";
import { SignOutLink } from "@/components/layout/sign-out-link";

/**
 * Shown to accounts with the "client" role. The client-facing portal isn't scoped per client
 * yet, so rather than route them somewhere that would leak another client's data, they get an
 * explicit "not enabled" screen. Deliberately outside the (app) group — it renders no sidebar,
 * no navigation, and loads no agency data.
 */
export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldAlert className="h-5 w-5" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">Your account isn&apos;t enabled yet</h1>
          <p className="text-sm text-muted-foreground">
            This account is registered but doesn&apos;t have access to the workspace. If you&apos;re
            part of the Ownova team, ask an admin to assign your role. If you&apos;re a client, your
            portal is on the way.
          </p>
        </div>

        <SignOutLink />
      </div>
    </div>
  );
}
