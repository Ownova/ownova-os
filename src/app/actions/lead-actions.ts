"use server";

import { revalidatePath } from "next/cache";
import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { requireInternalTeam } from "@/lib/auth-guard";
import { logActivity } from "@/lib/data/activity";

/**
 * Working a lead: moving it along the pipeline and recording what happened.
 *
 * These are the two things you actually do after opening a lead — everything else in CRM is
 * reading. Both write to the same client the scraper created, so a scraped lead and a form lead
 * are worked identically.
 */
const STAGES = [
  "lead",
  "contacted",
  "meeting",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export async function updateClientStageAction(clientId: string, stage: string): Promise<void> {
  const session = await requireInternalTeam();
  if (!STAGES.includes(stage as (typeof STAGES)[number])) throw new Error("Unknown pipeline stage.");
  if (!isAwsDbConfigured) return;

  const [client] = await query<{ name: string }>(`select name from clients where id = :clientId`, {
    clientId,
  });
  if (!client) throw new Error("That lead no longer exists.");

  await query(
    `update clients set stage = :stage::pipeline_stage, last_activity_at = now() where id = :clientId`,
    { stage, clientId }
  );

  await logActivity({
    actorId: session.mode === "cognito" ? session.sub : null,
    entityType: "client",
    action: `${client.name} moved to ${stage.replace("_", " ")}`,
    entityId: clientId,
  });

  revalidatePath("/crm");
  revalidatePath(`/crm/${clientId}`);
  revalidatePath("/dashboard");
}

/**
 * Logs a note against a lead.
 *
 * Also bumps last_activity_at, because a note is by definition activity — without that, a lead
 * you called yesterday still looks untouched in the list, which is how leads get called twice
 * or not at all.
 */
export async function addClientNoteAction(clientId: string, body: string): Promise<void> {
  const session = await requireInternalTeam();
  const text = body.trim();
  if (!text) throw new Error("Write something first.");
  if (!isAwsDbConfigured) return;

  await query(
    `insert into client_notes (client_id, author_id, body) values (:clientId, :authorId, :body)`,
    { clientId, authorId: session.mode === "cognito" ? session.sub : null, body: text }
  );
  await query(`update clients set last_activity_at = now() where id = :clientId`, { clientId });

  revalidatePath(`/crm/${clientId}`);
  revalidatePath("/crm");
}
