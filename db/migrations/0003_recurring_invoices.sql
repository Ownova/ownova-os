-- Ownova OS — recurring invoices.
--
-- Monthly retainers were being re-created by hand every month, which is exactly the kind of
-- work this system exists to remove. An invoice can now carry a cadence; the app generates the
-- next copy when it comes due.
--
-- Design notes:
--   * A recurring invoice is an ordinary invoice with a cadence attached, not a separate
--     "template" entity. That keeps one billing table, one numbering sequence, and means an
--     existing invoice can be made recurring without re-entering anything.
--   * `recurrence_next_at` is the date the *next* copy is due to be created. Storing the next
--     date rather than deriving it from the last run means a generation that is missed (nobody
--     opened the app for a week) still produces exactly one invoice, not a backlog of catch-up
--     copies, and the date is inspectable in the UI.
--   * Generated copies point back at their source via `recurring_source_id` and never carry a
--     cadence themselves, so a copy can never start recurring on its own.
--   * All columns are nullable / defaulted, so this is safe against the populated invoices table.

create type invoice_recurrence as enum ('monthly', 'quarterly', 'yearly');

alter table invoices add column recurrence invoice_recurrence;
alter table invoices add column recurrence_next_at date;
alter table invoices add column recurring_source_id uuid references invoices(id) on delete set null;

-- Only rows that actually recur are scanned on each generation pass.
create index idx_invoices_recurrence_due
  on invoices (recurrence_next_at)
  where recurrence is not null;

create index idx_invoices_recurring_source on invoices (recurring_source_id);
