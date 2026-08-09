import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { documents as mockDocuments } from "@/lib/mock-data";
import type { DocumentFile } from "@/types";

interface DocumentRow {
  id: string;
  name: string;
  folder: string;
  size_kb: number;
  uploaded_by_name: string | null;
  version: number;
  created_at: string;
  shared_with_id: string | null;
  shared_with_name: string | null;
}

function rowToDocument(row: DocumentRow): DocumentFile {
  return {
    id: row.id,
    name: row.name,
    folder: row.folder as DocumentFile["folder"],
    sizeKb: row.size_kb,
    uploadedBy: row.uploaded_by_name ?? "Unknown",
    uploadedAt: row.created_at,
    version: row.version,
    sharedWithClientId: row.shared_with_id ?? undefined,
    sharedWithClientName: row.shared_with_name ?? undefined,
  };
}

export async function getDocuments(): Promise<DocumentFile[]> {
  if (!isAwsDbConfigured) return mockDocuments;
  const rows = await query<DocumentRow>(
    `select d.id, d.name, d.folder, d.size_kb, d.version, d.created_at,
            u.full_name as uploaded_by_name,
            case when d.owner_type = 'client' then d.owner_id end as shared_with_id,
            c.name as shared_with_name
     from documents d
     left join users u on u.id = d.uploaded_by
     left join clients c on d.owner_type = 'client' and c.id = d.owner_id
     order by d.created_at desc`
  );
  return rows.map(rowToDocument);
}
