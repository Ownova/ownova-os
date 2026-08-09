import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Amplify Hosting reserves the "AWS_" prefix, so config is read from APP_AWS_* instead.
// Credentials are optional: production uses the SSR compute role via the default credential
// chain, and APP_AWS_* keys exist only for local development (see lib/aws/db.ts).
const region = process.env.APP_AWS_REGION;
const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
const bucket = process.env.S3_BUCKET_NAME;

export const isS3Configured = Boolean(region && bucket);

let client: S3Client | null = null;
function getClient() {
  if (!isS3Configured) {
    throw new Error("S3 is not configured. Set APP_AWS_REGION and S3_BUCKET_NAME in .env.local.");
  }
  client ??= new S3Client({
    region,
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  return client;
}

/** Uploads a file buffer to S3 under `key` (e.g. `clients/{id}/contract.pdf`). */
export async function uploadFile(key: string, body: Buffer | Uint8Array, contentType: string) {
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
  return key;
}

/**
 * Short-lived signed URL the browser can PUT directly to, so file bytes never pass through the
 * server. Uploading via a server action would mean the whole file has to be buffered in the SSR
 * runtime, which has a request body limit well below typical document sizes.
 *
 * contentType is bound into the signature, so the browser must send the same Content-Type header
 * it asked for -- that stops a signed URL for a PDF being reused to upload something else.
 */
export async function getUploadUrl(key: string, contentType: string, expiresInSeconds = 300) {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

/** Short-lived signed URL for downloading a private object (default 15 min). */
export async function getDownloadUrl(key: string, expiresInSeconds = 900) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

export async function deleteFile(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
