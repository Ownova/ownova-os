import { NextResponse } from "next/server";
import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { getDownloadUrl, isS3Configured } from "@/lib/aws/s3";
import { getServerSession } from "@/lib/session";
import { getPortalScope } from "@/lib/data/client-portal";

/**
 * Redirects a client to a short-lived signed URL for one of their own files.
 *
 * The ownership check is part of the SQL (`owner_type = 'client' and owner_id = :clientId`), so a
 * document belonging to another client — or a general agency file — simply doesn't match and no
 * URL is ever minted.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.role !== "client") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!isAwsDbConfigured || !isS3Configured) {
    return new NextResponse("File storage isn't configured", { status: 503 });
  }

  const scope = await getPortalScope(session.sub);
  if (!scope) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const [row] = await query<{ storage_path: string }>(
    `select storage_path from documents
     where id = :id and owner_type = 'client' and owner_id = :clientId`,
    { id, clientId: scope.clientId }
  );
  if (!row?.storage_path) return new NextResponse("Not found", { status: 404 });

  const url = await getDownloadUrl(row.storage_path);
  return NextResponse.redirect(url);
}
