"use server";

import { randomUUID } from "crypto";
import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { getUploadUrl, getDownloadUrl, isS3Configured } from "@/lib/aws/s3";
import { revalidatePath } from "next/cache";

const ALLOWED_FOLDERS = ["Contracts", "Invoices", "Quotations", "Brand Assets", "Client Files"] as const;
type Folder = (typeof ALLOWED_FOLDERS)[number];

/** 25 MB — comfortably covers contracts and design assets without inviting bulk media storage. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface PrepareUploadInput {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  folder: string;
}

/**
 * Step 1 of the upload: authorise, then hand the browser a short-lived presigned PUT URL.
 *
 * The storage key is generated server-side from a UUID rather than the user-supplied filename,
 * so a crafted name can't traverse paths or overwrite another object. The original name is kept
 * separately as display metadata.
 */
export async function prepareDocumentUploadAction(input: PrepareUploadInput): Promise<{
  uploadUrl: string;
  storagePath: string;
}> {
  await requireInternalTeam();

  if (!isS3Configured) throw new Error("File storage isn't configured.");
  if (input.sizeBytes > MAX_UPLOAD_BYTES) throw new Error("Files must be 25 MB or smaller.");
  if (!ALLOWED_FOLDERS.includes(input.folder as Folder)) throw new Error("Unknown folder.");

  const extension = input.fileName.includes(".") ? `.${input.fileName.split(".").pop()}` : "";
  const storagePath = `documents/${randomUUID()}${extension}`;
  const uploadUrl = await getUploadUrl(storagePath, input.contentType);

  return { uploadUrl, storagePath };
}

export interface RecordDocumentInput {
  name: string;
  folder: string;
  storagePath: string;
  sizeBytes: number;
}

/**
 * Step 2: called once the browser's PUT to S3 succeeds. Kept separate so a failed or abandoned
 * upload never leaves a database row pointing at an object that doesn't exist.
 */
export async function recordDocumentAction(input: RecordDocumentInput): Promise<void> {
  const session = await requireInternalTeam();

  if (!isAwsDbConfigured) return;
  if (!ALLOWED_FOLDERS.includes(input.folder as Folder)) throw new Error("Unknown folder.");

  await query(
    `insert into documents (owner_type, name, folder, storage_path, size_kb, uploaded_by, version)
     values ('general', :name, :folder::document_folder, :storagePath, :sizeKb, :uploadedBy, 1)`,
    {
      name: input.name,
      folder: input.folder,
      storagePath: input.storagePath,
      sizeKb: Math.max(1, Math.round(input.sizeBytes / 1024)),
      uploadedBy: session.mode === "cognito" ? session.sub : null,
    }
  );

  revalidatePath("/documents");
}

/**
 * Issues a short-lived download URL. Documents stay private in S3 -- nothing is publicly
 * readable, so every download is authorised here first.
 */
export async function getDocumentDownloadUrlAction(documentId: string): Promise<string> {
  await requireInternalTeam();

  if (!isAwsDbConfigured || !isS3Configured) throw new Error("File storage isn't configured.");

  const [row] = await query<{ storage_path: string }>(
    `select storage_path from documents where id = :documentId`,
    { documentId }
  );
  if (!row?.storage_path) throw new Error("Document not found.");

  return getDownloadUrl(row.storage_path);
}
