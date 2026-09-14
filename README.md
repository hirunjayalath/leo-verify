# LeoVerify

Credentialing platform for the Leo Club of University of Moratuwa — and, by design, for every Leo club in Sri Lanka later.

**The certificate PDF is a convenience copy. The database record is the only thing that is ever authoritative.**

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 · React 19 · TypeScript · App Router |
| Database | PostgreSQL via Supabase · Prisma 7 |
| Auth | Supabase Auth (`src/proxy.ts`) |
| Storage | Cloudflare R2 (local `/public/uploads` fallback) |
| PDF / QR | pdf-lib · qrcode · Fabric.js designer |
| Jobs | Inngest (sync fallback when unset) |
| Email | Resend |
| Rate limit | Upstash (in-memory fallback) |
| Hosting | Vercel + Supabase + R2 |
| Runtime | Node.js ≥ 24 |

## Getting started

```bash
npm install
cp .env.example .env
# Fill DATABASE_URL, CERT_HMAC_SECRET (openssl rand -hex 32), Supabase, R2, Resend
# Local UI without Auth: AUTH_DEV_BYPASS=true (never in production)
npx prisma generate
npx prisma migrate deploy   # or migrate dev locally
npm run db:seed
# Supabase SQL editor: apply supabase/rls-policies.sql
# Set SEED_ADMIN_SUPABASE_ID to your Auth user UUID; disable AUTH_DEV_BYPASS
npm run dev
```

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

1. Env vars set on Vercel (including `CERT_HMAC_SECRET`, Supabase, R2, Resend, `NEXT_PUBLIC_APP_URL`).
2. Migrations applied + **RLS policies applied** (`supabase/rls-policies.sql`).
3. Seed UOM club/admin; Auth user UUID linked; `AUTH_DEV_BYPASS` **false** (ignored outside development anyway).
4. MFA enabled for club admins in Supabase Auth.
5. Run the operator smoke checklist above.
6. Optional: Inngest + Upstash for bulk import and rate limits at scale.

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

- Multi-tenant schema (`clubId` / `districtId`) from day one.
- Verification: `/v/[id]?t=<token>` — live DB + HMAC; no login wall.
- Revoked public page: only “This certificate has been revoked.”
- Templates are layout JSON + background URL (Rule 5).
- Bulk CSV validates all rows before any write; re-runs skip duplicates.
- Public org signup: `/signup` (Club.type=`public`, plan entitlements).
- Open Badges 3.0 export: `GET /api/credentials/[uniqueId]/badge?t=<token>` (HMAC still primary).

## Roadmap

- **Phase 0:** UOM issuance + verification + revoke + CSV + email (implemented)
- **Phase 1:** Multi-club · district admin · opt-in public profiles (implemented)
- **Phase 2:** Public org SaaS · Open Badges 3.0 export (implemented)
