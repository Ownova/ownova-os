import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeadsTable } from "@/components/crm/leads-table";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { getClients } from "@/lib/data/clients";
import { NewClientDialog } from "@/components/crm/new-client-dialog";
import { requireInternalPage } from "@/lib/auth-guard";
import { PortalAccessDialog } from "@/components/crm/portal-access-dialog";

export default async function CRMPage() {
  const session = await requireInternalPage();
  const canManagePortal = ["admin", "ceo"].includes(session.role);

  const clients = await getClients();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">CRM</h1>
          <p className="text-sm text-muted-foreground">Leads, prospects, and clients across the full pipeline.</p>
        </div>
        <div className="flex gap-2">
          {canManagePortal && <PortalAccessDialog clients={clients} />}
          <NewClientDialog />
        </div>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="table">All Clients</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline">
          <PipelineBoard clients={clients} />
        </TabsContent>
        <TabsContent value="table">
          <LeadsTable clients={clients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
