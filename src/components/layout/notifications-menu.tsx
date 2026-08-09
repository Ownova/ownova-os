"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import type { ActivityItem } from "@/types";

/**
 * The bell previously rendered a permanent unread dot and did nothing when clicked. It now opens
 * the most recent activity from the audit log, and the dot only appears when there's something to
 * see -- a badge that's always lit teaches people to ignore it.
 */
export function NotificationsMenu({ items }: { items: ActivityItem[] }) {
  const [seen, setSeen] = React.useState(false);
  const hasUnread = items.length > 0 && !seen;

  return (
    <DropdownMenu onOpenChange={(open) => open && setSeen(true)}>
      <DropdownMenuTrigger
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        aria-label={hasUnread ? `Notifications, ${items.length} recent` : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {hasUnread && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Recent activity</p>
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Nothing yet. Activity appears here as work happens across the agency.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {items.map((item) => (
              <div key={item.id} className="px-3 py-2 hover:bg-muted/40">
                <p className="text-sm leading-snug">{item.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(item.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
