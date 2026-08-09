import { Globe, Download, MessageSquare, Upload } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getClients, getClientById } from "@/lib/data/clients";
import { getInvoices } from "@/lib/data/invoices";
import { getProjects } from "@/lib/data/projects";
import { requireInternalPage } from "@/lib/auth-guard";

// Preview of what a client sees when they log in. In Phase 4 this becomes a separate
// route group gated by the `client` role + client_portal_access table (see 0001_init.sql).
const PREVIEW_CLIENT_ID = "cl_2";

export default async function ClientPortalPage() {
  // Internal preview only: this page shows an arbitrary client's data, so it must never be
  // reachable by a "client" role account.
  await requireInternalPage();

  const allClients = await getClients();
  // Real DB mode has real UUIDs, not the "cl_2" mock id — fall back to the first client so the
  // preview still renders something sensible once this module is wired to Aurora.
  const previewId = allClients.some((c) => c.id === PREVIEW_CLIENT_ID) ? PREVIEW_CLIENT_ID : allClients[0]?.id;
  const [client, invoices, projects] = await Promise.all([
    previewId ? getClientById(previewId) : Promise.resolve(undefined),
    getInvoices(),
    getProjects(),
  ]);
  if (!client) {
    return <p className="text-sm text-muted-foreground">No clients yet — add one in the CRM to preview the client portal.</p>;
  }
  const clientInvoices = invoices.filter((i) => i.clientId === client.id);
  const clientProjects = projects.filter((p) => p.clientId === client.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Client Portal</h1>
        <p className="text-sm text-muted-foreground">
          Preview of the client-facing view — currently showing {client.company}.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Clients get their own login with access limited to their own records by row-level security.
          They can view invoices, download PDFs, track projects, approve quotations, upload files, and message the team.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-foreground text-base font-semibold">Your Invoices</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientInvoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.number}</TableCell>
                    <TableCell><Badge variant={i.status === "paid" ? "success" : "warning"}>{i.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{formatDate(i.dueDate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(i.total, i.currency)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/api/invoices/${i.id}/pdf`} download={`${i.number}.pdf`}>
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-foreground text-base font-semibold">Your Projects</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              {clientProjects.map((p) => (
                <div key={p.id} className="rounded-lg border border-border/70 p-3">
                  <p className="text-sm font-medium">{p.name}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{p.progress}% · due {formatDate(p.dueDate)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-foreground text-base font-semibold">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Upload className="h-4 w-4" /> Upload a file
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <MessageSquare className="h-4 w-4" /> Message the team
              </Button>
              <p className="pt-1 text-xs text-muted-foreground">
                Client uploads and messaging arrive with the per-client portal.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
