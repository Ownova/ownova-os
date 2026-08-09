-- Ownova OS — adds the schema needed to wire the Calendar and Documents pages off mock data.
--
-- Calendar: there was no table backing CalendarEvent (meetings covers only one of its four
-- event types: meeting, deadline, invoice_due, task) — this adds a dedicated calendar_events
-- table that covers all four.
--
-- Documents: the existing `documents` table has no `folder` or file-size columns, both of
-- which the Documents page needs (folder grouping cards, formatted file size). Added as
-- nullable-safe additions (NOT NULL with defaults) so this is safe to run against the
-- already-populated documents table from 0001_init.sql.

create type calendar_event_type as enum ('meeting', 'deadline', 'invoice_due', 'task');

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  type calendar_event_type not null default 'meeting',
  related_to text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_calendar_events_date on calendar_events(event_date);

alter table calendar_events enable row level security;
create policy "internal team full access" on calendar_events for all
  using (is_internal_team()) with check (is_internal_team());

create type document_folder as enum ('Contracts', 'Invoices', 'Quotations', 'Brand Assets', 'Client Files');

alter table documents add column folder document_folder not null default 'Client Files';
alter table documents add column size_kb integer not null default 0;
