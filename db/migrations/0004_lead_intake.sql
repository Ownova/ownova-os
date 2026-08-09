-- Ownova OS — automated lead intake.
--
-- Everything that creates a lead from outside the app (the Google Form via Apps Script, the
-- Cal.com booking webhook, and later the lead scraper) posts to one authenticated endpoint.
-- This table is what makes that safe to do.
--
-- Why it exists: webhooks retry. Apps Script retries on a 5xx, Cal.com retries on timeout, and a
-- scraper re-run will happily re-send yesterday's rows. Without a record of what has already
-- been ingested, one retry silently produces a second client, a second calendar event and a
-- second quotation. `external_id` is the sender's own identifier for the event (form response
-- ID, booking UID, scraped profile URL) and the unique constraint on (source, external_id) is
-- what turns a retry into a no-op instead of a duplicate.
--
-- The raw payload is kept verbatim. When a lead looks wrong six weeks later, the question is
-- always "what did they actually submit" — and a parsed-and-discarded payload can't answer it.

create table lead_intake (
  id uuid primary key default gen_random_uuid(),
  -- 'google_form' | 'cal_booking' | 'scrape' | 'manual'
  source text not null,
  -- The sending system's own ID for this event. Unique per source.
  external_id text not null,
  client_id uuid references clients(id) on delete set null,
  -- Verbatim submission, for auditing and for re-parsing if the mapping ever changes.
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index idx_lead_intake_dedupe on lead_intake (source, external_id);
create index idx_lead_intake_client on lead_intake (client_id);

-- Where a lead came from, kept on the client itself so the CRM list can show it without a join.
alter table clients add column source text;
alter table clients add column website text;

alter table lead_intake enable row level security;
create policy "internal team full access" on lead_intake for all
  using (is_internal_team()) with check (is_internal_team());
