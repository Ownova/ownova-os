"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocumentDownloadUrlAction } from "@/app/actions/documents";
import { toastActionError } from "@/lib/action-toast";

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
        toastActionError(error, `Could not download ${fileName}.`);
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={download} disabled={isPending} aria-label={`Download ${fileName}`}>
      <Download className="h-4 w-4" />
    </Button>
  );
}
