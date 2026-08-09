import { redirect } from "next/navigation";
import { FileText, FolderKanban, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { OwnovaMark } from "@/components/brand/logo";
import { agency } from "@/lib/agency";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getServerSession } from "@/lib/session";
import { SignOutLink } from "@/components/layout/sign-out-link";
import {
  getPortalScope,
  getPortalInvoices,
  getPortalProjects,
  getPortalDocuments,
} from "@/lib/data/client-portal";

/**
 * The client-facing portal.
 *
 * Deliberately outside the (app) route group: it must not render the internal sidebar, must not
 * load agency-wide data, and must not share a layout whose guards are written for staff. A client
 * lands here and can reach nothing else.
 *
 * Everything shown is scoped in SQL to the one client linked to this login via
 * client_portal_access. There is no client picker and no id in the URL, so there is nothing to
 * tamper with — the scope is derived entirely from the verified session.
 */
export const dynamic = "force-dynamic";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  paid: "success",
  pending: "warning",
  partially_paid: "warning",
  overdue: "destructive",
  cancelled: "secondary",
};

export default async function ClientPortalPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // Internal staff have their own workspace; this page is only for client logins.
  if (session.role !== "client") redirect("/dashboard");

  const scope = await getPortalScope(session.sub);
  if (!scope) redirect("/no-access");

  const [invoices, projects, documents] = await Promise.all([
    getPortalInvoices(scope.clientId),
    getPortalProjects(scope.clientId),
    getPortalDocuments(scope.clientId),
  ]);

  const outstanding = invoices.filter((i) => i.status !== "paid");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <OwnovaMark size={32} />
          <div>
            <p className="text-sm font-semibold">{agency.name}</p>
            <p className="text-xs text-muted-foreground">Client Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {scope.company ?? scope.clientName}
          </p>
          <SignOutLink />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Welcome, {scope.clientName}</h1>
          <p className="text-sm text-muted-foreground">
            Your invoices, projects, and shared files with {agency.name}.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base font-semibold">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {invoices.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No invoices yet. Anything issued to you will appear here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[invoice.status] ?? "secondary"}>
                          {invoice.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/api/portal/invoices/${invoice.id}/pdf`}
                          download={`${invoice.number}.pdf`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {outstanding.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {outstanding.length} invoice{outstanding.length === 1 ? "" : "s"} awaiting payment.
                Bank details are on each PDF.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold">Your Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active projects.</p>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{project.name}</p>
                      <Badge variant="secondary">{project.status.replace(/_/g, " ")}</Badge>
                    </div>
                    {project.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{project.description}</p>
                    )}
                    {project.dueDate && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Due {formatDate(project.dueDate)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base font-semibold">Shared Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No files shared yet. Documents {agency.name} shares with you will appear here.
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-border/70 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(doc.uploadedAt)}</p>
                      </div>
                    </div>
                    <a
                      href={`/api/portal/documents/${doc.id}`}
                      className="shrink-0 text-sm text-primary hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border p-4">
          <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Questions about an invoice or project? Email{" "}
            <a href={`mailto:${agency.email}`} className="text-primary hover:underline">
              {agency.email}
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
