import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { getTeamMembers } from "@/lib/data/team";
import { getAllTasks } from "@/lib/data/projects";
import { getServerSession } from "@/lib/session";
import { RoleSelect } from "@/components/team/role-select";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { requireInternalPage } from "@/lib/auth-guard";

export default async function TeamPage() {
  await requireInternalPage();

  const [teamMembers, projectTasks, session] = await Promise.all([getTeamMembers(), getAllTasks(), getServerSession()]);
  const canEditRoles = session ? ["admin", "ceo"].includes(session.role) : false;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Roles, departments, and current workload.</p>
        </div>
        <InviteMemberDialog canAssignRoles={canEditRoles} />
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

                <div className="flex flex-wrap items-center gap-2">
                  {canEditRoles ? <RoleSelect userId={m.id} currentRole={m.role} /> : <Badge>{m.role}</Badge>}
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
