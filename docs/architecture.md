# Environment contract

LeoVerify is one Next.js app plus Postgres. Production also depends on Auth, object storage, email, a job runner, and a shared rate limiter. Each of those systems has its own credential. That inventory is the design.

[`.env.example`](../.env.example) is the contract. Local [`.env`](../.env) is a gitignored copy (empty values are allowed). Production values live on the host (Vercel), never in the repo. [`src/lib/env.ts`](../src/lib/env.ts) enforces the production set at boot.

Development may fall back: local disk for files, skip email, in-process imports, in-memory rate limit, `AUTH_DEV_BYPASS`. Production does not fall back. Missing required secrets throw before the first request.

If a secret has been pasted into chat, email, or a screenshot, rotate it in that vendor’s dashboard and update `.env` / Vercel. `.env` is gitignored and must stay uncommitted.

## Postgres

Authoritative certificate and club data. Prisma reads `DATABASE_URL` at runtime. Migrations and seed use `DIRECT_DATABASE_URL` (direct `:5432`, never the pooler).

`DATABASE_URL` and `SERVICE_DATABASE_URL` must be the two app roles (`leoverify_app` / `leoverify_service`). An owner or `postgres` pooler URL is not a supported runtime mode.

| Variable | Production |
|---|---|
| `DATABASE_URL` | Required. Transaction pooler as role `leoverify_app` (RLS + `withRlsContext`). |
| `SERVICE_DATABASE_URL` | Required. Transaction pooler as role `leoverify_service` (public verify, portals, signup). |
| `DIRECT_DATABASE_URL` | Required. Owner session URL (`:5432`) for Prisma migrate and seed only. |
| `PG_POOL_MAX` | Optional. Default `3`. |

Absent in production: the process cannot verify or issue. Boot fails.

## Supabase Auth

Login, claim, and admin MFA (AAL2). Gated in `src/proxy.ts` and `src/lib/auth.ts`.

| Variable | Production |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Required |

Absent in production: admin and claim routes have no identity. Boot fails.

## HMAC signing

QR and verify URLs are HMAC-SHA256 over live DB fields (`CERT_HMAC_SECRET`). This is our secret, not a vendor key.

| Variable | Production |
|---|---|
| `CERT_HMAC_SECRET` | Required, at least 32 characters |
| `CERT_HMAC_SECRET_PREVIOUS` | Optional, rotation only |

Absent in production: tokens cannot be issued or checked. Boot fails. Development also requires `CERT_HMAC_SECRET`.

## Public app URL

Verification links and QR codes embed `NEXT_PUBLIC_APP_URL`.

| Variable | Production |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Required (canonical https origin) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Optional |

Absent in production: QR and email links would point at localhost. Boot fails.

## Cloudflare R2

Private certificate PDFs and template assets. The S3 client lives in `src/lib/storage/r2.ts`.

| Variable | Production |
|---|---|
| `R2_ACCOUNT_ID` | Required |
| `R2_ACCESS_KEY_ID` | Required |
| `R2_SECRET_ACCESS_KEY` | Required |
| `R2_BUCKET_NAME` | Required |
| `R2_PUBLIC_URL` | Optional. Leave empty so PDFs stay private. |

Absent in production: files would write to the serverless filesystem. Boot fails. Development writes to `public/uploads`.

## Resend

Certificate issuance email (`src/lib/email/resend.ts`).

| Variable | Production |
|---|---|
| `RESEND_API_KEY` | Required |
| `EMAIL_FROM` | Required (verified domain) |

Absent in production: recipients would not get mail. Boot fails. Development skips send when the key is empty.

## Inngest

Bulk CSV import and email fan-out (`src/inngest/`).

| Variable | Production |
|---|---|
| `INNGEST_EVENT_KEY` | Required |
| `INNGEST_SIGNING_KEY` | Required |
| `IMPORT_ROW_CONCURRENCY` | Optional. Default `5`. |

Absent in production: long imports would run inside the HTTP request. Boot fails. Development runs imports in-process.

## Upstash

Shared rate limit on public `/v/*`, signup, and PDF routes. Production without Redis **fails closed** (every limited request is denied). There is no in-memory limiter in production.

| Variable | Production |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Required |
| `UPSTASH_REDIS_REST_TOKEN` | Required |

Absent in production: boot fails, and if a request still reached the limiter it would be denied. Development uses an in-memory map.

## Sentry

Error reporting. Optional in every environment.

| Variable | Production |
|---|---|
| `SENTRY_DSN` | Optional |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional |

Empty DSNs disable Sentry.

## Seed and local-only

| Variable | Notes |
|---|---|
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SUPABASE_ID` / `SEED_ADMIN_NAME` | Optional. First-club seed (bypass lookup). |
| `SEED_CLUB_ADMIN_LOGIN_EMAIL` / `SEED_CLUB_ADMIN_PASSWORD` | Optional. Extra UOM club admin Auth user (local). |
| `SEED_DISTRICT_ADMIN_EMAIL` / `SEED_DISTRICT_ADMIN_PASSWORD` / `SEED_DISTRICT_ADMIN_NAME` | Optional. District admin Auth + Prisma row. `SEED_DISTRICT_ADMIN_SUPABASE_ID` optional when service role can create/link. |
| `SEED_RECIPIENT_EMAIL` / `SEED_RECIPIENT_PASSWORD` | Optional. Auth-only recipient; seed issues one cert for `/claim`. |
| `SEED_PROMOTE_UOM_DISTRICT_ADMIN` | Optional. Do not use for role QA — keeps the bypass admin as club admin. |
| `AUTH_DEV_BYPASS` | Local only. Must not be `true` when `NODE_ENV=production`. Ignored on Vercel. |
