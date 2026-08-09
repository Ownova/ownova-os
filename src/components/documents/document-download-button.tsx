"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDocumentDownloadUrlAction } from "@/app/actions/documents";

/**
 * Documents are private in S3, so there's no static URL to link to. This asks the server for a
 * short-lived signed URL at click time and then opens it.
 */
export function DocumentDownloadButton({ documentId, fileName }: { documentId: string; fileName: string }) {
  const [isPending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      try {
        const url = await getDocumentDownloadUrlAction(documentId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Could not download ${fileName}.`);
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={download} disabled={isPending} aria-label={`Download ${fileName}`}>
      <Download className="h-4 w-4" />
    </Button>
  );
}
