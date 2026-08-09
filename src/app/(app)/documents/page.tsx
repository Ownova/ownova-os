import { FileText, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getDocuments } from "@/lib/data/documents";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { DocumentDownloadButton } from "@/components/documents/document-download-button";

const folders = ["Contracts", "Invoices", "Quotations", "Brand Assets", "Client Files"] as const;

function formatSize(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export default async function DocumentsPage() {
  const documents = await getDocuments();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">Contracts, invoices, brand assets, and client files.</p>
        </div>
        <UploadDocumentDialog />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {folders.map((f) => {
          const count = documents.filter((d) => d.folder === f).length;
          return (
            <Card key={f}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f}</p>
                  <p className="text-xs text-muted-foreground">{count} file{count === 1 ? "" : "s"}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-2">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.uploadedBy} · {formatDate(d.uploadedAt)} · {formatSize(d.sizeKb)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary">{d.folder}</Badge>
              <Badge variant="outline">v{d.version}</Badge>
              <DocumentDownloadButton documentId={d.id} fileName={d.name} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
