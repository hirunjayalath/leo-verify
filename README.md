# LeoVerify

Credentialing platform for the Leo Club of University of Moratuwa — and, by design, for every Leo club in Sri Lanka later.

**The certificate PDF is a convenience copy. The database record is the only thing that is ever authoritative.**

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 · React 19 · TypeScript · App Router |
| Database | PostgreSQL via Supabase · Prisma 7 · transaction pooler on Vercel |
| Auth | Supabase Auth (`src/proxy.ts`) |
| Storage | Cloudflare R2 (local `/public/uploads` in development only) |
| PDF / QR | pdf-lib · qrcode · Fabric.js designer |
| Jobs | Inngest (in-process only in development when unset) |
| Email | Resend (skipped in development when unset) |
| Rate limit | Upstash (**required in production**; fail closed if missing) |
| Observability | `/api/health` · optional Sentry |
| Hosting | Vercel + Supabase + R2 + Resend + Inngest + Upstash |
| Runtime | Node.js ≥ 24 |
| Env contract | [`.env.example`](.env.example) · [`docs/architecture.md`](docs/architecture.md) |

## Getting started

```bash
npm install
cp .env.example .env
# Contract: docs/architecture.md — every variable stays; empty is allowed locally
# Required locally: DATABASE_URL, CERT_HMAC_SECRET (openssl rand -hex 32)
# Local UI without Auth: AUTH_DEV_BYPASS=true (forbidden in production)
npx prisma generate
npx prisma migrate deploy   # or migrate dev locally
npm run db:seed
# Supabase SQL editor: apply supabase/rls-policies.sql
# Set SEED_ADMIN_SUPABASE_ID to your Auth user UUID; disable AUTH_DEV_BYPASS
npm run dev
```

### Database URLs (serverless)

| Env | Use |
|---|---|
| `DATABASE_URL` | App runtime. On Vercel use Supabase **transaction pooler** (`:6543`, `?pgbouncer=true`). |
| `DIRECT_DATABASE_URL` | Prisma migrate / `db push` only (direct `:5432`). |
| `PG_POOL_MAX` | `1` (default) or `2` per serverless isolate — never a large pool on Vercel. |

Without the pooler + singleton `Pool`, concurrent verify/issue exhausts Postgres connections first.

### UOM operator smoke checklist

Manual path for Leo Club of University of Moratuwa as platform operator:

1. Login as UOM club admin (`AUTH_DEV_BYPASS` off in any shared/staging env).
2. Create an event → upload a template (auto-approved on create) → optionally edit layout.
3. Issue one certificate with recipient email → confirm Resend send when configured.
4. Open `/v/[id]?t=…` → status Valid → **Download PDF**.
5. Revoke → public page shows only “This certificate has been revoked.”
6. Reissue an issued cert → new QR/token; old link fails HMAC.
7. CSV import a small roster; confirm no duplicates on re-run.
8. Claim: recipient signs in with matching email → claim → toggle public profile.
9. District (optional): seed district admin → create club → paste Supabase Auth UUID to link club admin.
10. Launch gate: `supabase/rls-policies.sql` applied after migrate.

### UOM production launch checklist

1. Full production secret contract set on Vercel (see [`.env.example`](.env.example) / [`docs/architecture.md`](docs/architecture.md)): pooler `DATABASE_URL`, `DIRECT_DATABASE_URL`, `CERT_HMAC_SECRET`, Supabase, `NEXT_PUBLIC_APP_URL`, R2, Resend, Inngest, **Upstash**. Boot throws if any required value is missing.
2. Migrations applied + **RLS policies applied** (`supabase/rls-policies.sql`) + **app role** (`supabase/app-role.sql`).
3. Seed UOM club/admin; Auth user UUID linked; `AUTH_DEV_BYPASS` **false** (rejected when `NODE_ENV=production`).
4. MFA (TOTP) required for club/district admins — enable Multi-Factor Authentication in the Supabase project, then complete enrollment at `/admin/mfa` (AAL2). `AUTH_DEV_BYPASS` skips this locally only.
5. Point UptimeRobot / Better Stack at `GET /api/health` (expects 200 + `db: true`).
6. Optional: `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` for error tracking.
7. Run the operator smoke checklist above.
8. Inngest configured for bulk import (emails fan out as separate steps).

### Security launch gates

1. Apply `supabase/rls-policies.sql` after migrate (PostgREST/anon path), then `supabase/app-role.sql`. Point `DATABASE_URL` at role `leoverify_app` (no `BYPASSRLS`). Keep `DIRECT_DATABASE_URL` as the owner for migrate. App-layer `clubId` / session checks stay required; `withRlsContext` sets `app.current_supabase_id` for the SQL helper.
2. Never set `AUTH_DEV_BYPASS` on Vercel (ignored when `VERCEL`/`VERCEL_ENV` is set, and outside `NODE_ENV=development`).
3. Prefer private R2 (no public bucket) + gated `/api/certificates/[id]/pdf?t=…` downloads. Logos/templates upload with long `Cache-Control`; PDFs stay short/private.
4. Public signup requires a signed-in Supabase session; district invite must not steal users from other districts.
5. Upstash must be set in production — missing credentials **fail closed** on `/v` and PDF rate limits (no silent memory fallback on Vercel).

### Capacity upgrade ladder

| Signal | Upgrade |
|---|---|
| Connection errors / pool waits | Raise Supabase compute; keep pooler; **never** widen `PG_POOL_MAX` on serverless |
| Import jobs > few minutes | Raise `IMPORT_ROW_CONCURRENCY` / Inngest concurrency; keep email as separate steps |
| Email bounce / Resend rate limits | Move to SES + suppression list (~1–2k emails/day is still fine on Resend) |
| Read-heavy org portals | Already short-TTL cached branding on `/o/[slug]`; add Edge HTML cache if needed |
| Global audience | Vercel multi-region; R2 remains PDF origin |
| Heavier PDF load | Dedicated queue worker reusing the same pdf-lib overlay code |

Infrastructure stays **Vercel + Supabase + R2 + Upstash + Inngest** — upgrades are config and job shape, not a platform rewrite.

**Do not** long-cache live verify status without revoke invalidation. Branding/gallery CDN caches are safe; certificate truth stays live from Postgres.

### Load-test checklist (before launch spikes)

1. Point k6/Artillery at `/v/[id]?t=…` and `/api/health` with pooler `DATABASE_URL`.
2. Confirm p95 verify under ~500ms excluding cold start; watch Supabase connection count.
3. Run a 500-row CSV import via Inngest; confirm no Vercel timeout and emails enqueue separately.
4. Revoke mid-test — public page must flip without depending on a status cache.

### Admin MFA (Supabase AAL2)

Club and district admin routes require authenticator assurance level **aal2**:

1. In the Supabase dashboard: **Authentication → Providers / Multi-Factor** — enable TOTP.
2. Sign in at `/login` with the admin account.
3. You are redirected to `/admin/mfa` until a TOTP factor is enrolled and the session is verified.
4. Subsequent visits need a fresh code when the session drops back to aal1 (e.g. after password-only re-login).

Local `AUTH_DEV_BYPASS=true` (development only) skips the AAL2 gate so seed admins can operate without Supabase MFA.

### HMAC secret rotation

1. Set `CERT_HMAC_SECRET_PREVIOUS` to the current secret.
2. Set `CERT_HMAC_SECRET` to a new `openssl rand -hex 32` value.
3. Redeploy. Existing QR links verify via the previous secret; new issues use the current secret.
4. After all outstanding PDFs are acceptable to re-issue (or enough time has passed), clear `CERT_HMAC_SECRET_PREVIOUS`.

## Scripts

- `npm run dev` / `build` / `start`
- `npm test` — golden-path verification + CSV + issue tests
- `npm run db:seed` / `db:migrate` / `db:generate`

## Architecture

```
Adapters (app/)          Domain (lib/)              Infra
─────────────────        ─────────────────          ──────────
Server actions    →      certificates/              db (Prisma)
API routes        →      templates/                 storage/r2
Inngest jobs      →      recipients/                email/resend
UI components     →      orgs/                      auth / supabase
```

**Rules of the house**

- Server actions and route handlers are **adapters**: auth → validate → call `lib/*` → `revalidatePath`. Prefer zero Prisma in actions.
- `lib/certificates/pure/` (token, verify, id, layout, parse) must not import `db`, `r2`, or `email`. Stable import paths remain `@/lib/certificates/token` etc. via re-exports.
- Issuance: `issue.ts` facade → `issue-core` (DB) + `issue-pdf` (render/upload).
- Jobs: `inngest/client.ts` + `inngest/jobs/*`; `functions.ts` only registers handlers.
- UI: `components/admin`, `components/public`, `components/verify`, `components/ui`.
- Verification is always live DB + HMAC — never long-cache certificate status.

**Environment contract**

- [`.env.example`](.env.example) lists every variable. [`docs/architecture.md`](docs/architecture.md) says why each system exists.
- Local `.env` may leave production secrets empty. `AUTH_DEV_BYPASS` is local only.
- Production (`VERCEL` or `NODE_ENV=production`) calls `assertProductionEnv()` at boot in `src/instrumentation.ts`.
- Upstash stays fail-closed in production. There is no in-memory limiter on the live host.

**Vendor swaps (same function names)**

| Concern | Today | Swap by replacing |
|--------|--------|-------------------|
| Object storage | Cloudflare R2 | `src/lib/storage/r2.ts` (`uploadObject`, `getShortLivedObjectUrl`, …) |
| Email | Resend | `src/lib/email/resend.ts` (`sendCertificateEmail`) |
| Jobs | Inngest | `src/inngest/jobs/*` (keep event names if possible) |

**Product notes**

- Multi-tenant schema (`clubId` / `districtId`) from day one.
- Client-delivered product — no self-serve payments; quotas are operator-set (`Club.monthlyCertLimit`).
- Verification: `/v/[id]?t=<token>` — live DB + HMAC; no login wall.
- Template gallery + Fabric designer; layout JSON is data (Rule 5).
- Bulk CSV validates all rows before any write; issue wizard at `/admin/issue`.
- Open Badges 3.0 export: `GET /api/credentials/[uniqueId]/badge?t=<token>` (HMAC still primary).

## Roadmap

- **Phase 0:** UOM issuance + verification + revoke + CSV + email (implemented)
- **Phase 1:** Multi-club · district admin · opt-in public profiles (implemented)
- **Phase 2:** Public org self-serve signup · Open Badges 3.0 export (implemented)
