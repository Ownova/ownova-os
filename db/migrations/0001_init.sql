-- Ownova OS — initial schema (AWS: Aurora Serverless v2, PostgreSQL-compatible)
-- Run via the RDS Data API (see scripts/migrate.ts) or psql against the cluster endpoint.
--
-- Auth note: this app uses Amazon Cognito for authentication, not a Postgres-native auth
-- schema. Cognito issues each user a stable `sub` (UUID) — that value is what's stored as
-- `users.id` below, so a row here is created the first time a Cognito user signs in
-- (see src/lib/aws/cognito.ts). There is no `auth.users` table to reference, unlike Supabase.

create extension if not exists "pgcrypto";

-- ========== ENUMS ==========
create type user_role as enum ('admin','ceo','manager','sales','marketing','finance','developer','client');
create type pipeline_stage as enum ('lead','contacted','meeting','proposal_sent','negotiation','won','lost');
create type project_status as enum ('planning','in_progress','review','completed','on_hold');
create type task_status as enum ('todo','in_progress','in_review','done');
create type task_priority as enum ('low','medium','high','urgent');
create type invoice_status as enum ('draft','pending','paid','partially_paid','cancelled','overdue');
create type payment_method as enum ('bank_transfer','stripe','paypal','wise','payoneer','cash');
create type payment_status as enum ('paid','pending','partial','refunded','overdue');
create type currency_code as enum ('USD','PKR','AED','EUR','GBP');

-- ========== USERS (mirrors Cognito) ==========
-- id = Cognito `sub` claim. Upserted by the app on first successful sign-in.
create table users (
  id uuid primary key,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'developer',
  department text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ========== CRM ==========
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  name text not null,
  email text,
  phone text,
  stage pipeline_stage not null default 'lead',
  value numeric(14,2) not null default 0,
  owner_id uuid references users(id) on delete set null,
  tags text[] not null default '{}',
  last_activity_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_clients_stage on clients(stage);
create index idx_clients_owner on clients(owner_id);

create table client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_at timestamptz not null default now()
);

-- ========== PROJECTS ==========
create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'planning',
  budget numeric(14,2) not null default 0,
  spent numeric(14,2) not null default 0,
  start_date date,
  due_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);
create index idx_projects_client on projects(client_id);
create index idx_projects_status on projects(status);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (project_id, user_id)
);

create table project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assignee_id uuid references users(id) on delete set null,
  due_date date,
  labels text[] not null default '{}',
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_tasks_project on project_tasks(project_id);
create index idx_tasks_status on project_tasks(status);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references project_tasks(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ========== QUOTATIONS ==========
create table quotations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  number text not null unique,
  currency currency_code not null default 'USD',
  status text not null default 'draft',
  issue_date date not null default current_date,
  valid_until date,
  terms text,
  created_at timestamptz not null default now()
);

create table quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  rate numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0
);

-- ========== INVOICING ==========
create table invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  number text not null unique, -- e.g. INV-2026-0001
  status invoice_status not null default 'draft',
  currency currency_code not null default 'USD',
  issue_date date not null default current_date,
  due_date date not null,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_invoices_client on invoices(client_id);
create index idx_invoices_status on invoices(status);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  rate numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(14,2) not null,
  method payment_method not null,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_payments_invoice on payments(invoice_id);

-- ========== FINANCE ==========
create table expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text,
  amount numeric(14,2) not null,
  spent_on date not null default current_date,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_expenses_category on expenses(category);

-- ========== DOCUMENTS ==========
-- storage_path points at an S3 object key (bucket configured in src/lib/aws/s3.ts).
create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null, -- 'client' | 'project' | 'invoice' | 'quotation' | 'general'
  owner_id uuid,
  name text not null,
  storage_path text not null, -- S3 object key
  uploaded_by uuid references users(id) on delete set null,
  version int not null default 1,
  created_at timestamptz not null default now()
);

-- ========== NOTIFICATIONS ==========
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, read);

-- ========== AUDIT LOG ==========
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ========== ROW LEVEL SECURITY ==========
-- Supabase's RLS relied on `auth.uid()`, which only exists inside Supabase's Postgres.
-- On plain Aurora Postgres we reproduce the same effect with a per-transaction session
-- variable that the app sets right after opening a Data API transaction (see
-- src/lib/aws/db.ts -> withUserContext()). Every policy below reads that variable instead
-- of a Supabase-specific function.

create table client_portal_access (
  user_id uuid primary key references users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade
);

create or replace function current_app_user_id() returns uuid as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$ language sql stable;

create or replace function current_app_role() returns text as $$
  select nullif(current_setting('app.current_role', true), '');
$$ language sql stable;

create or replace function is_internal_team() returns boolean as $$
  select coalesce(current_app_role(), '') <> 'client';
$$ language sql stable;

alter table clients enable row level security;
alter table projects enable row level security;
alter table project_tasks enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table quotations enable row level security;
alter table documents enable row level security;
alter table notifications enable row level security;

create policy "internal team full access" on clients for all
  using (is_internal_team()) with check (is_internal_team());
create policy "internal team full access" on projects for all
  using (is_internal_team()) with check (is_internal_team());
create policy "internal team full access" on project_tasks for all
  using (is_internal_team()) with check (is_internal_team());
create policy "internal team full access" on invoices for all
  using (is_internal_team()) with check (is_internal_team());
create policy "internal team full access" on invoice_items for all
  using (is_internal_team()) with check (is_internal_team());
create policy "internal team full access" on payments for all
  using (is_internal_team()) with check (is_internal_team());
create policy "internal team full access" on expenses for all
  using (is_internal_team()) with check (is_internal_team());
create policy "internal team full access" on quotations for all
  using (is_internal_team()) with check (is_internal_team());
create policy "internal team full access" on documents for all
  using (is_internal_team()) with check (is_internal_team());

create policy "own notifications" on notifications for select
  using (user_id = current_app_user_id());

create policy "client reads own invoices" on invoices for select
  using (client_id in (select client_id from client_portal_access where user_id = current_app_user_id()));
create policy "client reads own projects" on projects for select
  using (client_id in (select client_id from client_portal_access where user_id = current_app_user_id()));

-- IMPORTANT: RLS here is defense-in-depth, not the primary gate. Because the Data API
-- connects with one IAM-authenticated role for the whole app (there's no per-user Postgres
-- login the way Supabase gives each user a JWT-scoped connection), every query MUST go
-- through src/lib/aws/db.ts so `app.current_user_id` / `app.current_role` get set. Also
-- check the caller's role at the API-route / server-action layer before querying — see
-- docs/ARCHITECTURE.md "Authorization model".
