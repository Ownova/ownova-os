"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";

/** Clears both the client-side display session and the httpOnly server session cookie. */
export function SignOutLink() {
  const router = useRouter();

  async function handleSignOut() {
    signOut();
    await signOutAction();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
    >
      Sign out
    </button>
  );
}
