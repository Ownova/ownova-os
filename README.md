# Ownova OS

Internal operations platform for Ownova (AI Automation Agency).

**All 14 modules in the sidebar are built and running on realistic seed data:** Dashboard, CRM,
Projects, Quotations, Invoicing, Payments, Expenses, Team, Tasks, Calendar, Documents, Client
Portal (preview), Reports, and Settings. Next step is swapping the seed data for live AWS
queries — see `docs/ARCHITECTURE.md`.

Backend: **AWS** — Aurora Serverless v2 (Postgres, scale-to-zero) via the RDS Data API,
Cognito for auth, S3 for files. Chosen to minimize idle cost for a bootstrapped team; see the
cost table in `docs/ARCHITECTURE.md`.

## Important: don't develop inside a OneDrive-synced folder

This project currently lives in a OneDrive-synced folder. That's fine for the source files
(they're small text files), but **do not run `npm install` here** — `node_modules` contains
tens of thousands of small files, and OneDrive's sync engine will constantly lock/scan them,
causing slow installs, sync conflicts, and occasional "file in use" errors.

Before running anything, copy this folder to a local, non-synced path, e.g.:

```bash
# Windows (PowerShell)
robocopy "C:\Users\Lenovo\OneDrive\Documents\Ownova Knowledge Base\ownova-os" "C:\Dev\ownova-os" /E
cd C:\Dev\ownova-os
```

Then develop from `C:\Dev\ownova-os`. Push the folder to GitHub (recommended) and treat OneDrive
purely as a backup of your other docs, not of `node_modules`.

While you're there: this repo still has an empty `supabase/` folder and `src/lib/supabase/`
directory left over from an earlier version — this sandbox couldn't delete them from OneDrive.
Delete both in Explorer once you've copied the project out; nothing references them anymore.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in AWS values, or leave blank for demo mode
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. In demo mode (no AWS values set),
any email/password combination signs you in with realistic seed data across every live module.

## Connecting AWS

1. **Aurora Serverless v2 (Postgres)** — create a cluster, enable "Data API" in the cluster
   settings, and set minimum capacity to **0 ACU** (scale-to-zero). Note the cluster ARN and
   create/note a Secrets Manager secret ARN with the master credentials.
2. Run the schema against it: `db/migrations/0001_init.sql` (via the Data API, `psql`, or the
   RDS query editor in the console — full schema, enums, and RLS policies).
3. **Cognito** — create a User Pool. Add an app client with **no client secret**, and under
   "Auth flows" enable `ALLOW_USER_PASSWORD_AUTH`.
4. **S3** — create a private bucket for documents.
5. Fill in `.env.local`:
   ```
   AWS_REGION=us-east-1
   DB_CLUSTER_ARN=arn:aws:rds:...:cluster:ownova
   DB_SECRET_ARN=arn:aws:secretsmanager:...:secret:ownova-db
   DB_NAME=ownova
   COGNITO_USER_POOL_ID=us-east-1_xxxxxxx
   COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   S3_BUCKET_NAME=ownova-documents
   ```
6. For local dev, also set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` for an IAM user with
   `rds-data:*` on the cluster, `secretsmanager:GetSecretValue` on the secret,
   `cognito-idp:InitiateAuth` + `SignUp` + `AdminConfirmSignUp` on the user pool, and S3
   read/write on the bucket. In production, skip access keys and attach an IAM role instead.
7. Restart `npm run dev`. Auth now goes through real Cognito. Swap the mock-data reads in each
   page (`src/lib/mock-data.ts` imports) for `withUserContext()` calls from `src/lib/aws/db.ts`
   as you go — the TypeScript types in `src/types/index.ts` already match the schema.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check with no build output

## Docs

See `docs/ARCHITECTURE.md` for the AWS cost breakdown, folder structure, data flow, the
authorization model (RLS without Supabase's `auth.uid()`), the full ERD, and the Phase 2–5
roadmap.

## Verification status

Dependencies were installed and the codebase was type-checked with `tsc --noEmit` in a scratch
sandbox (not this OneDrive folder) during the original Supabase-based build; three real bugs
were found and fixed then (mismatched `@tanstack/react-table` major version, a `notFound()`
narrowing issue, and a zod resolver type mismatch — all still fixed here).

The AWS migration itself (new `src/lib/aws/*`, `src/app/actions/auth.ts`, updated `src/lib/auth.ts`)
was re-type-checked the same way after the change — see the note at the bottom of
`docs/ARCHITECTURE.md`'s Roadmap section for what's still mock data vs. wired up.

A full `next build` was not completed in the sandbox (it exceeded the sandbox's per-command time
limit). Run `npm install && npm run build` locally as the final check.
"# ownova-os" 
