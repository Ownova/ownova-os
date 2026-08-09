import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET_NAME;

export const isS3Configured = Boolean(region && bucket);

let client: S3Client | null = null;
function getClient() {
  if (!isS3Configured) {
    throw new Error("S3 is not configured. Set AWS_REGION and S3_BUCKET_NAME in .env.local.");
  }
  client ??= new S3Client({ region });
  return client;
}

/** Uploads a file buffer to S3 under `key` (e.g. `clients/{id}/contract.pdf`). */
export async function uploadFile(key: string, body: Buffer | Uint8Array, contentType: string) {
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
  return key;
}

/** Short-lived signed URL for downloading a private object (default 15 min). */
export async function getDownloadUrl(key: string, expiresInSeconds = 900) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

export async function deleteFile(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
