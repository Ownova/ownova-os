"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { prepareDocumentUploadAction, recordDocumentAction } from "@/app/actions/documents";
import { toastActionError } from "@/lib/action-toast";
import type { Client } from "@/types";

const FOLDERS = ["Contracts", "Invoices", "Quotations", "Brand Assets", "Client Files"];

/**
 * Uploads straight from the browser to S3 using a presigned URL, then records the metadata row
 * only after the transfer succeeds. The file bytes never touch the app server.
 */
export function UploadDocumentDialog({ clients = [] }: { clients?: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [folder, setFolder] = useState(FOLDERS[0]);
  // Empty means internal-only. Sharing has to be chosen deliberately: a file is never
  // exposed to a client portal just because it landed in the "Client Files" folder.
  const [clientId, setClientId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }

    setIsUploading(true);
    try {
      const { uploadUrl, storagePath } = await prepareDocumentUploadAction({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        folder,
      });

      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        // Must match the Content-Type bound into the signature, or S3 rejects the request.
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!response.ok) throw new Error("Upload to storage failed.");

      await recordDocumentAction({
        name: file.name,
        folder,
        storagePath,
        sizeBytes: file.size,
        clientId: clientId || null,
      });

      toast.success(`${file.name} uploaded`);
      setOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setClientId("");
      router.refresh();
    } catch (error) {
      toastActionError(error, "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>File</Label>
            <Input ref={fileInputRef} type="file" />
            <p className="text-xs text-muted-foreground">Up to 25 MB.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Folder</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm"
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
            >
              {FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Share with client</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              disabled={clients.length === 0}
            >
              <option value="">Internal only — not visible to any client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {clientId
                ? "This file will appear under Shared Files in their portal."
                : "Stays in the internal workspace."}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
