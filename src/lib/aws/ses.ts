import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// Amplify Hosting reserves the "AWS_" prefix, so config is read from APP_AWS_* instead.
// Credentials are optional: production uses the SSR compute role via the default credential
// chain, and APP_AWS_* keys exist only for local development (see lib/aws/db.ts).
const region = process.env.APP_AWS_REGION;
const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

/** The verified SES identity messages are sent from, e.g. "Ownova <billing@ownova.org>". */
const fromAddress = process.env.SES_FROM_ADDRESS;

export const isSesConfigured = Boolean(region && fromAddress);

let client: SESv2Client | null = null;
function getClient() {
  if (!isSesConfigured) {
    throw new Error("Email delivery isn't configured. Set SES_FROM_ADDRESS to a verified SES identity.");
  }
  client ??= new SESv2Client({
    region,
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  return client;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Uint8Array;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  /** Plain-text body. Kept text-only: it renders everywhere and never trips spam heuristics. */
  text: string;
  replyTo?: string;
  attachment?: EmailAttachment;
}

/** Wraps base64 at 76 chars, as MIME requires. */
function base64Lines(bytes: Uint8Array): string {
  const b64 = Buffer.from(bytes).toString("base64");
  return b64.replace(/(.{76})/g, "$1\r\n");
}

/**
 * RFC 5322 header encoding for anything non-ASCII (client names, subjects). Without this a
 * name like "Café Ltd" produces a malformed header and the message is rejected.
 */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x20-\x7E]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/**
 * Sends via SES. Uses the Raw content type rather than Simple because Simple cannot carry
 * attachments, and an invoice email without the invoice attached is not much use.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const boundary = `----ownova-${Date.now().toString(36)}`;
  const headers = [
    `From: ${fromAddress}`,
    `To: ${input.to}`,
    input.replyTo ? `Reply-To: ${input.replyTo}` : "",
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
  ].filter(Boolean);

  let raw: string;

  if (input.attachment) {
    raw = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      "Content-Transfer-Encoding: 8bit",
      "",
      input.text,
      "",
      `--${boundary}`,
      `Content-Type: ${input.attachment.contentType}; name="${input.attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${input.attachment.filename}"`,
      "",
      base64Lines(input.attachment.content),
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");
  } else {
    raw = [...headers, 'Content-Type: text/plain; charset=UTF-8', "", input.text, ""].join("\r\n");
  }

  await getClient().send(
    new SendEmailCommand({ Content: { Raw: { Data: Buffer.from(raw, "utf8") } } })
  );
}
