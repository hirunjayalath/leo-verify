# LeoVerify

Credentialing platform for the Leo Club of University of Moratuwa — and, by design, for every Leo club in Sri Lanka later.

**The certificate PDF is a convenience copy. The database record is the only thing that is ever authoritative.**

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 · React 19 · TypeScript · App Router |
| Database | PostgreSQL via Supabase · Prisma 7 |
| Auth | Supabase Auth |
| Storage | Cloudflare R2 (wired in a later build) |
| PDF / QR | pdf-lib · qrcode |
| Hosting | Vercel + Supabase + R2 |
| Runtime | Node.js ≥ 24 |

## Getting started

```bash
npm install
cp .env.example .env
# Fill DATABASE_URL, CERT_HMAC_SECRET (openssl rand -hex 32), Supabase keys, R2, Resend
# For local UI without Supabase Auth: AUTH_DEV_BYPASS=true (never in production)
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
# On Supabase: apply supabase/rls-policies.sql in the SQL editor
# Link SEED_ADMIN_SUPABASE_ID to your Auth user UUID, then disable AUTH_DEV_BYPASS
npm run dev
```

Deploy: set the same env vars in the Vercel project, connect the Git repo, and deploy. After deploy, smoke-check `/`, `/login`, and gated `/admin`.

Useful scripts:

- `npm run dev` — local app
- `npm run build` — production build
- `npm test` — golden-path certificate verification tests
- `npm run db:generate` / `npm run db:validate` — Prisma helpers

## Architecture notes

- Multi-tenant schema from day one (`clubId` / `districtId` on scoped tables).
- Verification tokens are HMAC-SHA256 over canonical certificate fields (`src/lib/certificates/`).
- Public verify route: `/v/[id]?t=<token>` — no login wall.
- Revoked certificates publicly show only: “This certificate has been revoked.”
- Agent rules live in `.cursor/rules/` and encode the 11 non-negotiable build rules.

## Phased roadmap

- **Phase 0 (this repo foundation):** UOM Leos — issuance + verification + revocation shell
- **Phase 1:** Multi-club Sri Lanka · district analytics · opt-in public recipient profiles
- **Phase 2:** Multi-tenant SaaS · Open Badges 3.0 export

## Out of scope in this initialization

Issuance flow, template designer canvas, CSV import, email dispatch, background jobs, and R2 upload wiring. Dependencies and schema are ready for those builds.
