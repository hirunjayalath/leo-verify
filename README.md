# LeoVerify

Issue Leo Club certificates and let anyone check them. Leo Club of University of Moratuwa runs this site. Other Leo clubs in Sri Lanka can be added later.

If the PDF and the site disagree, believe the site. The PDF is just a copy.

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
# Contract: docs/architecture.md. Every variable stays. Empty is allowed locally.
# Required locally: DATABASE_URL, CERT_HMAC_SECRET (openssl rand -hex 32)
# Local UI without Auth: AUTH_DEV_BYPASS=true (forbidden in production)
npx prisma generate
npx prisma migrate deploy   # or migrate dev locally
# Plain Postgres (no Supabase auth schema): npm run db:migrate-deploy
npm run db:seed
# Supabase SQL editor: apply supabase/rls-policies.sql
# Optional: SEED_DISTRICT_ADMIN_* / SEED_RECIPIENT_* / SEED_CLUB_ADMIN_LOGIN_*
# Set SEED_ADMIN_SUPABASE_ID to your Auth user id. Then turn AUTH_DEV_BYPASS off.
npm run dev
```

### Database URLs (serverless)

| Env | Use |
|---|---|
| `DATABASE_URL` | App runtime. On Vercel use Supabase **transaction pooler** (`:6543`, `?pgbouncer=true`). |
| `DIRECT_DATABASE_URL` | Prisma migrate / `db push` only (direct `:5432`). |
| `PG_POOL_MAX` | `1` (default) or `2` per serverless isolate. Do not use a large pool on Vercel. |

Without the pooler and a singleton `Pool`, concurrent check or issue work runs out of Postgres connections first.

### UOM operator smoke checklist

Manual path for Leo Club of University of Moratuwa as platform operator:

1. Login as UOM club admin (`AUTH_DEV_BYPASS` off in any shared or staging env).
2. Create an event, upload a template (approved on create), then edit the layout if you want.
3. Issue one certificate with a recipient email. Confirm Resend send when configured.
4. Open `/v/[id]?t=…`. Status should be Valid. Use **Download PDF**.
5. Revoke. The public page shows only “This certificate has been revoked.”
6. Reissue an issued cert. The new QR and token work. The old link fails HMAC.
7. CSV import a small roster. Confirm no duplicates on a re-run.
8. Claim: recipient signs in with the matching email, claims, then can turn on a public profile.
9. District (optional): seed a district admin, create a club, paste the Supabase Auth user id to link a club admin.
10. Launch gate: `supabase/rls-policies.sql` applied after migrate.

### UOM production launch checklist

1. Full production secret contract set on Vercel (see [`.env.example`](.env.example) / [`docs/architecture.md`](docs/architecture.md)): pooler `DATABASE_URL` (`leoverify_app`), `SERVICE_DATABASE_URL` (`leoverify_service`), `DIRECT_DATABASE_URL`, `CERT_HMAC_SECRET`, Supabase, `NEXT_PUBLIC_APP_URL`, R2, Resend, Inngest, **Upstash**. Boot throws if any required value is missing.
2. Migrations applied (includes RLS and roles). Point `DATABASE_URL` at `leoverify_app` and `SERVICE_DATABASE_URL` at `leoverify_service`.
3. Seed UOM club and admin. Auth user id linked. `AUTH_DEV_BYPASS` is **false** (rejected when `NODE_ENV=production`).
4. MFA (TOTP) required for club and district admins. Enable Multi-Factor Authentication in the Supabase project, then finish enrollment at `/admin/mfa` (AAL2). `AUTH_DEV_BYPASS` skips this locally only.
5. Point UptimeRobot / Better Stack at `GET /api/health` (expects 200 + `db: true`).
6. Optional: `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` for error tracking.
7. Run the operator smoke checklist above.
8. Inngest configured for bulk import (emails fan out as separate steps).

### Security launch gates

1. Deploy migrations (RLS + `leoverify_app` / `leoverify_service`). Point `DATABASE_URL` at `leoverify_app` and `SERVICE_DATABASE_URL` at `leoverify_service` (no `BYPASSRLS`). Keep `DIRECT_DATABASE_URL` as the owner for migrate. App-layer `clubId` / session checks stay required. `withRlsContext` sets `app.current_supabase_id`.
2. Never set `AUTH_DEV_BYPASS` on Vercel (ignored when `VERCEL`/`VERCEL_ENV` is set, and outside `NODE_ENV=development`).
3. Prefer private R2 (no public bucket) and gated `/api/certificates/[id]/pdf?t=…` downloads. Logos and templates upload with long `Cache-Control`. PDFs stay short and private.
4. Public signup requires a signed-in Supabase session. A district invite must not steal users from other districts.
5. Upstash must be set in production. Missing secrets **fail closed** on `/v` and PDF rate limits (no silent memory fallback on Vercel).

### Capacity upgrade ladder

| Signal | Upgrade |
|---|---|
| Connection errors / pool waits | Raise Supabase compute. Keep the pooler. **Never** widen `PG_POOL_MAX` on serverless. |
| Import jobs > few minutes | Raise `IMPORT_ROW_CONCURRENCY` / Inngest concurrency. Keep email as separate steps. |
| Email bounce / Resend rate limits | Move to SES + suppression list (~1–2k emails/day is still fine on Resend) |
| Read-heavy club pages | Branding on `/o/[slug]` already uses a short TTL cache. Add Edge HTML cache if needed. |
| Global audience | Vercel multi-region. R2 remains the PDF origin. |
| Heavier PDF load | Dedicated queue worker reusing the same pdf-lib overlay code |

Infrastructure stays **Vercel + Supabase + R2 + Upstash + Inngest**. Upgrades are config and job shape, not a platform rewrite.

**Do not** long-cache live check status without revoke invalidation. Branding and gallery CDN caches are safe. Certificate status stays live from Postgres.

### Load-test checklist (before launch spikes)

1. Point k6/Artillery at `/v/[id]?t=…` and `/api/health` with pooler `DATABASE_URL`.
2. Confirm p95 check under ~500ms excluding cold start. Watch Supabase connection count.
3. Run a 500-row CSV import via Inngest. Confirm no Vercel timeout and emails enqueue separately.
4. Revoke mid-test. The public page must flip without depending on a status cache.

### Admin MFA (Supabase AAL2)

Club and district admin routes require authenticator assurance level **aal2**:

1. In the Supabase dashboard: **Authentication → Providers / Multi-Factor**. Enable TOTP.
2. Sign in at `/login` with the admin account.
3. You are redirected to `/admin/mfa` until a TOTP factor is enrolled and the session is verified.
4. Later visits need a fresh code when the session drops back to aal1 (for example after a password-only re-login).

Local `AUTH_DEV_BYPASS=true` (development only) skips the AAL2 gate so seed admins can operate without Supabase MFA.

### HMAC secret rotation

1. Set `CERT_HMAC_SECRET_PREVIOUS` to the current secret.
2. Set `CERT_HMAC_SECRET` to a new `openssl rand -hex 32` value.
3. Redeploy. Existing QR links check via the previous secret. New issues use the current secret.
4. After all outstanding PDFs are acceptable to re-issue (or enough time has passed), clear `CERT_HMAC_SECRET_PREVIOUS`.

## Scripts

- `npm run dev` / `build` / `start`
- `npm test`: golden-path verification, CSV, and issue tests
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

- Server actions and route handlers are **adapters**: auth, then validate, then call `lib/*`, then `revalidatePath`. Prefer zero Prisma in actions.
- `lib/certificates/pure/` (token, verify, id, layout, parse) must not import `db`, `r2`, or `email`. Stable import paths remain `@/lib/certificates/token` etc. via re-exports.
- Issuance: `issue.ts` facade → `issue-core` (DB) + `issue-pdf` (render/upload).
- Jobs: `inngest/client.ts` + `inngest/jobs/*`; `functions.ts` only registers handlers.
- UI: `components/admin`, `components/public`, `components/verify`, `components/ui`.
- A check is always live DB + HMAC. Do not long-cache certificate status.

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
- Client-delivered product. No self-serve payments. Quotas are operator-set (`Club.monthlyCertLimit`).
- Check page: `/v/[id]?t=<token>`. Live DB + HMAC. No login wall.
- Template gallery + Fabric designer. Layout JSON is data (Rule 5).
- Bulk CSV validates all rows before any write. Issue wizard at `/admin/issue`.
- Open Badges 3.0 export: `GET /api/credentials/[uniqueId]/badge?t=<token>` (HMAC is still the primary check).

## Roadmap

- **Phase 0:** UOM issuance + verification + revoke + CSV + email (implemented)
- **Phase 1:** Multi-club · district admin · opt-in public profiles (implemented)
- **Phase 2:** Public org self-serve signup · Open Badges 3.0 export (implemented)
