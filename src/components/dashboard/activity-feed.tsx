import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Receipt, Users, FolderKanban, ListChecks, Wallet } from "lucide-react";
import type { ActivityItem } from "@/types";

const iconMap = {
  invoice: Receipt,
  client: Users,
  project: FolderKanban,
  task: ListChecks,
  payment: Wallet,
};

export function ActivityFeed({ recentActivity }: { recentActivity: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {recentActivity.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No activity yet. Creating clients, projects, invoices, or payments will show up here.
          </p>
        )}
        {recentActivity.map((a) => {
          const Icon = iconMap[a.type];
          return (
            <div key={a.id} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm leading-snug">{a.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
