import "server-only";
import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { logActivity } from "@/lib/data/activity";

/**
 * Turns an inbound submission into a CRM lead.
 *
 * Shared by every intake source — the Google Form, the Cal.com booking webhook, and later the
 * lead scraper — so there is exactly one place that decides how an outside record becomes a row
 * in `clients`. When the mapping needs to change, it changes once.
 *
 * Leads land at stage 'lead', never as a client. "Client" should keep meaning "someone who pays
 * us", otherwise the dashboard's active-client count becomes a count of form submissions and
 * every figure built on top of it quietly stops being true.
 */
export interface IntakeLead {
  source: string;
  /** The sending system's own ID. Same id twice = same lead, not a second one. */
  externalId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  /** Free-text extras (how they heard about us, socials, answers) written to the client note. */
  notes?: string | null;
  /** Drives the outreach-compliance flag shown in CRM. See lib/intake/compliance.ts. */
  country?: string | null;
  address?: string | null;
  industry?: string | null;
  payload?: unknown;
}

export interface IntakeResult {
  clientId: string;
  /** False when this exact submission had already been ingested — a webhook retry. */
  created: boolean;
  /** True when we attached to an existing client rather than creating one. */
  matchedExisting: boolean;
}

/** Normalises an email for comparison. Postgres `lower()` does the same on the query side. */
function normaliseEmail(email?: string | null): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export async function ingestLead(input: IntakeLead): Promise<IntakeResult | null> {
  if (!isAwsDbConfigured) return null;

  // --- 1. Replay check -----------------------------------------------------------------------
  // Webhooks retry: Apps Script on a 5xx, Cal.com on a timeout, a scraper on a re-run. Without
  // this, one retry produces a second client, a second calendar event and a second quotation.
  const [seen] = await query<{ client_id: string | null }>(
    `select client_id from lead_intake where source = :source and external_id = :externalId`,
    { source: input.source, externalId: input.externalId }
  );
  if (seen?.client_id) {
    return { clientId: seen.client_id, created: false, matchedExisting: true };
  }

  const email = normaliseEmail(input.email);
  const name = input.name.trim() || email || "Unnamed lead";

  // --- 2. Match an existing person before creating a new one ---------------------------------
  // Someone who fills the form twice, or who is already in the CRM from a manual entry, must not
  // become two records — a split contact history is how follow-ups get missed. Email is the only
  // field reliable enough to match on; names collide and phone formats vary.
  let clientId: string | null = null;
  let matchedExisting = false;

  if (email) {
    const [existing] = await query<{ id: string }>(
      `select id from clients where lower(email) = :email limit 1`,
      { email }
    );
    if (existing) {
      clientId = existing.id;
      matchedExisting = true;
    }
  }

  // --- 3. Company ----------------------------------------------------------------------------
  let companyId: string | null = null;
  const companyName = input.company?.trim();
  if (companyName) {
    const [existingCompany] = await query<{ id: string }>(
      `select id from companies where lower(name) = lower(:name) limit 1`,
      { name: companyName }
    );
    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const [created] = await query<{ id: string }>(
        `insert into companies (name, website) values (:name, :website) returning id`,
        { name: companyName, website: input.website?.trim() || null }
      );
      companyId = created?.id ?? null;
    }
  }

  // --- 4. Create or enrich the client --------------------------------------------------------
  if (clientId) {
    // Only fill blanks. A form submission must never overwrite a phone number or company that
    // someone on the team corrected by hand — the human edit is the more trustworthy one.
    await query(
      `update clients
          set phone = coalesce(phone, :phone),
              website = coalesce(website, :website),
              company_id = coalesce(company_id, :companyId),
              source = coalesce(source, :source),
              country = coalesce(country, :country),
              address = coalesce(address, :address),
              industry = coalesce(industry, :industry),
              last_activity_at = now()
        where id = :clientId`,
      {
        phone: input.phone?.trim() || null,
        website: input.website?.trim() || null,
        companyId,
        source: input.source,
        country: input.country?.trim() || null,
        address: input.address?.trim() || null,
        industry: input.industry?.trim() || null,
        clientId,
      }
    );
  } else {
    const [created] = await query<{ id: string }>(
      `insert into clients (name, email, phone, website, company_id, stage, source,
                            country, address, industry, last_activity_at)
       values (:name, :email, :phone, :website, :companyId, 'lead'::pipeline_stage, :source,
               :country, :address, :industry, now())
       returning id`,
      {
        name,
        email,
        phone: input.phone?.trim() || null,
        website: input.website?.trim() || null,
        companyId,
        source: input.source,
        country: input.country?.trim() || null,
        address: input.address?.trim() || null,
        industry: input.industry?.trim() || null,
      }
    );
    if (!created) return null;
    clientId = created.id;
  }

  // --- 5. Keep what they actually said -------------------------------------------------------
  // The questionnaire answers are the entire reason for having a questionnaire. They go on the
  // client so whoever takes the call can read them without leaving the CRM.
  if (input.notes?.trim()) {
    await query(
      `insert into client_notes (client_id, author_id, body) values (:clientId, null, :body)`,
      { clientId, body: input.notes.trim() }
    );
  }

  // --- 6. Record the ingest, which also closes the door on replays ---------------------------
  await query(
    `insert into lead_intake (source, external_id, client_id, payload)
     values (:source, :externalId, :clientId, cast(:payload as jsonb))
     on conflict (source, external_id) do nothing`,
    {
      source: input.source,
      externalId: input.externalId,
      clientId,
      payload: JSON.stringify(input.payload ?? {}),
    }
  );

  await logActivity({
    actorId: null,
    entityType: "client",
    action: matchedExisting
      ? `${name} submitted the intake form again (${input.source})`
      : `New lead from ${input.source}: ${name}`,
    entityId: clientId,
  });

  return { clientId, created: !matchedExisting, matchedExisting };
}
