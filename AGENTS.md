<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LeoVerify Product Guardrails & Invariants

## The 5 Actors & Routing
1. **Anyone (No Account)**: Checks certificates at `/v/[id]?t=...` or `/o/[slug]`. Never gets PDF download or LinkedIn share.
2. **Recipient**: Signs in with matching email at `/claim` to claim credentials, download private PDF, share flyer/LinkedIn offsite, and toggle `/u/[slug]` profile. Never gets `/admin`.
3. **Club Admin (Leo & Public Org)**: Manages events, templates, and certificate issuance for their own club at `/admin`.
4. **District Admin**: Onboards clubs and invites club admins at `/admin/district`; reviews public-org draft templates. No UI club switcher.
5. **UOM Club Admin (Platform Operator)**: Role is standard `club_admin` on club `UOM`. Has two exclusive pages: `/admin/operators` (manage districts/district admins) and `/admin/reports` (per-club counts only).

## Routing Contract
- Shared login: `/login` → `/continue` routes:
  - `club_admin` → `/admin`
  - `district_admin` → `/admin/district`
  - recipient / others → `/claim`
- Club/District admins without MFA are gated to `/admin/mfa` before dashboard access.

## Non-Features (Do Not Implement / Invariants)
- **NO Certificate Deletion**: Certificates are permanent records; revocation is a status flag change (`revoked`), never a `DELETE`.
- **NO Public PDF Downloads**: Direct PDF downloads on `/v/*` are restricted. Only authenticated matching recipients or operator admins may download.
- **NO Login Wall on `/v/*`**: Anyone can verify with valid ID + HMAC token.
- **NO Cross-Club Data Access**: UOM Reports shows aggregate counts only—never display or query Club B's certificate rows for another club.
- **NO UI Club Switcher**: Even if backend code exists, do not reintroduce a club switcher in navigation.
- **NO Official LinkedIn Certification API**: Sharing is standard offsite link/flyer sharing, not direct LinkedIn API integration.
- **NO Billing / Payments / Wallet Passes**: Quotas are operator-configured; there is no self-serve billing or pass generation.
