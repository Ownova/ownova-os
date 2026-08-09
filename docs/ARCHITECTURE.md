# Ownova OS — Architecture

## Backend: AWS (cost-optimized for a bootstrapped startup)

| Layer | Service | Why this one |
|---|---|---|
| Database | **Aurora Serverless v2** (PostgreSQL-compatible), min capacity **0 ACU** | Scale-to-zero (GA Nov 2024) means ~$0 compute when idle — only pay per ACU-hour under real traffic, vs. a fixed RDS instance costing ~$12–22/mo whether it's used or not. |
| Database access | **RDS Data API** (`@aws-sdk/client-rds-data`) | HTTPS-based, IAM-authenticated — no VPC networking, connection pooling, or NAT Gateway (often a hidden ~$30+/mo). Works from any host (Vercel, Amplify Hosting, Lambda). |
| Auth | **Amazon Cognito User Pools** | Free for the first 10,000 monthly active users, permanently — not just a 12-month trial. |
| File storage | **Amazon S3** | Fractions of a cent per GB at this scale. |

Estimated idle-month cost for a small team: roughly **$1–5/mo** (mostly Aurora storage), rising only with actual usage — versus $25–40+/mo for an always-on RDS instance + NAT Gateway.

Tradeoff to know: Aurora Serverless v2 briefly "wakes up" from 0 ACU on the first request after idle, adding latency to that first call. Fine for an internal ops tool; revisit (set a small non-zero minimum ACU) if that cold start ever bothers users on a customer-facing surface.

## Folder structure

```
ownova-os/
  src/
    app/
      (auth)/login, (auth)/signup        — public auth pages
      actions/auth.ts                    — "use server" — the only place the Cognito SDK runs
      (app)/layout.tsx                   — sidebar + topbar + command palette shell
      (app)/dashboard                    — executive dashboard
      (app)/crm                          — pipeline + client table
      (app)/projects, projects/[id]      — kanban + project detail + task board
      (app)/quotations, quotations/[id]  — quotation list + convert-to-invoice
      (app)/invoices, invoices/new, [id] — invoice list, create form, printable detail
      (app)/payments, expenses           — payment ledger, expense manager + chart
      (app)/team, tasks                  — team directory, global task board
      (app)/calendar, documents          — month calendar, document library
      (app)/reports, settings            — financial reports, agency/role settings
      (app)/client-portal                — preview of the client-facing view
    components/
      ui/        — hand-rolled shadcn-style primitives (button, card, table, dialog, ...)
      layout/    — sidebar, topbar, command palette, theme provider
      dashboard/, crm/, projects/, invoices/, expenses/  — module-specific components
    lib/
      aws/db.ts       — RDS Data API client + withUserContext() for RLS
      aws/cognito.ts  — Cognito SDK calls (server-only)
      aws/s3.ts       — S3 upload / signed download URL helpers
      auth.ts         — client-side session wrapper: calls actions/auth.ts, or falls back
                         to a localStorage mock session when AWS isn't configured
      mock-data.ts    — seed data shaped exactly like the DB schema below
      utils.ts        — cn(), currency/date formatting
    types/index.ts   — domain types shared by mock data, DB queries, and UI
  db/migrations/0001_init.sql  — full Postgres schema + RLS (run against Aurora)
  docs/ARCHITECTURE.md         — this file
```

`supabase/` and `src/lib/supabase/` still exist as empty deprecated stubs — this sandbox
couldn't delete them from the OneDrive-synced folder. Delete both yourself in Explorer.

## Data flow

Every module currently reads from `src/lib/mock-data.ts`. Those objects are typed identically
to the Aurora tables in `db/migrations/0001_init.sql`, so migrating a page is a local change —
swap the mock-data import for a `query()` (or `withUserContext()`) call from `src/lib/aws/db.ts`.
No component needs to change its props or rendering.

```ts
// before
import { clients } from "@/lib/mock-data";

// after — inside a Server Component or Server Action
import { withUserContext } from "@/lib/aws/db";
const clients = await withUserContext({ userId, role }, (run) =>
  run("select * from clients order by created_at desc")
);
```

## Auth flow

`src/lib/auth.ts` (client) calls the Server Actions in `src/app/actions/auth.ts`, which are the
only place the Cognito SDK runs (it needs AWS credentials, so it can't run in the browser).
When `AWS_REGION` / `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` aren't set, the action returns
`{ mode: "mock" }` and the client falls back to a localStorage session — the whole app stays
clickable with zero AWS setup.

Known Phase 1 simplification: Cognito tokens are cached in localStorage rather than an httpOnly
cookie, and sign-up auto-confirms the user instead of showing an email verification code step.
Both are fine for a demo; fix before onboarding real users (see comments in `actions/auth.ts`).

## Authorization model (replaces Supabase's `auth.uid()` RLS)

Supabase gives every user their own JWT-scoped Postgres connection, so `auth.uid()` works
automatically inside RLS policies. Aurora + the Data API use one IAM-authenticated connection
for the whole app — there's no per-user Postgres login. `withUserContext()` in `src/lib/aws/db.ts`
reproduces the same effect by opening a transaction and running
`select set_config('app.current_user_id', ..., true)` / `set_config('app.current_role', ..., true)`
before your query, and the RLS policies in `db/migrations/0001_init.sql` read those instead of
`auth.uid()`. Treat this as defense-in-depth, not the only gate: always check the caller's role
in the Server Action / Route Handler too, before querying.

## Database schema (ERD summary)

```
users (Cognito sub as id, role enum)
   └─< client_portal_access >─ clients
companies ─< clients ─< client_notes
                     ─< meetings
                     ─< projects ─< project_members (join → users)
                                 ─< project_tasks ─< task_comments
                     ─< quotations ─< quotation_items
                     ─< invoices ─< invoice_items
                                 ─< payments
expenses (standalone, created_by → users)
documents (polymorphic owner_type/owner_id → client | project | invoice | quotation; storage_path = S3 key)
notifications (→ users)
audit_log (→ users)
```

## AI assistant architecture (Phase 3)

Keep the assistant provider-agnostic from day one:

```
lib/ai/
  provider.ts     — interface: complete(prompt, tools) -> AssistantResponse
  bedrock.ts       — Amazon Bedrock implementation (fits the AWS-native stack)
  openai.ts / claude.ts  — direct API alternatives
  actions/           — one file per callable action (createInvoice, showOverdueInvoices, ...),
                        each a typed function the model can call as a tool
```

The `AIInsightsPanel` component on the dashboard is the placeholder for this — currently
static copy, designed to be replaced by a live call to `lib/ai/provider.ts`.

## Roadmap

- **Phase 1 — done (mock data):** auth, dashboard, CRM, projects, invoicing.
- **Phase 2 — done (mock data):** quotations (with convert-to-invoice), payment tracking,
  expense manager + category chart, team directory, global task board, month calendar,
  document library, reports, settings, client-portal preview.
- **Phase 2b — next:** provision Aurora + Cognito + S3 (see README "Connecting AWS"), run
  `db/migrations/0001_init.sql`, and replace `@/lib/mock-data` imports with `withUserContext()`
  calls page by page.
- **Phase 3:** AI assistant (`lib/ai/*`, likely Amazon Bedrock), AI insights backed by real data.
- **Phase 4:** promote the client-portal preview to a real gated route using the `client` role
  + `client_portal_access` table.
- **Phase 5:** multi-tenant SaaS — add an `organizations` table, scope every table above with
  `organization_id`, update RLS policies accordingly.
