"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Command as CommandIcon } from "lucide-react";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import type { ActivityItem } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { getSession, signOut } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";

export function Topbar({ notifications = [] }: { notifications?: ActivityItem[] }) {
  const router = useRouter();
  const [userName, setUserName] = React.useState("Ownova");

  React.useEffect(() => {
    const session = getSession();
    if (session) setUserName(session.name);
  }, []);

  async function handleSignOut() {
    signOut();
    await signOutAction();
    router.push("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-card/40 px-5">
      <button
        className="flex w-72 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/70"
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump to...</span>
        <span className="flex items-center gap-0.5 rounded border border-border px-1 text-xs">
          <CommandIcon className="h-3 w-3" />K
        </span>
      </button>

      <div className="flex items-center gap-3">
        <NotificationsMenu items={notifications} />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted/50">
            <Avatar>
              <AvatarFallback>{initials(userName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Both previously did nothing when clicked. Settings is where profile and agency
                details actually live, so they point there rather than at placeholder screens. */}
            <DropdownMenuItem onSelect={() => router.push("/settings")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings")}>Agency Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
