import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeadsTable } from "@/components/crm/leads-table";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getClients } from "@/lib/data/clients";

export default async function CRMPage() {
  const clients = await getClients();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">CRM</h1>
          <p className="text-sm text-muted-foreground">Leads, prospects, and clients across the full pipeline.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New Client
        </Button>
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
