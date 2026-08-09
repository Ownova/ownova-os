import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { teamMembers, projectTasks } from "@/lib/mock-data";
import { initials } from "@/lib/utils";

export default function TeamPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Roles, departments, and current workload.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Invite Member
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((m) => {
          const assigned = projectTasks.filter((t) => t.assignee === m.name);
          const open = assigned.filter((t) => t.status !== "done").length;
          const done = assigned.filter((t) => t.status === "done").length;

          return (
            <Card key={m.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge>{m.role}</Badge>
                  <Badge variant="secondary">{m.department}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <p className="text-lg font-semibold">{open}</p>
                    <p className="text-xs text-muted-foreground">Open tasks</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{done}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
