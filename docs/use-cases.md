# LeoVerify Use Cases & Actors

This document specifies the five actors, routing flows, end-to-end user journeys, and architectural invariants that exist in the application today.

---

## The 5 Actors

1. **Anyone (No Account)**: Public verifier. Checks certificates via QR / direct link.
2. **Recipient**: The certificate holder. Claims credentials with their email, downloads private PDFs, shares flyers / LinkedIn offsite, and manages an opt-in public profile.
3. **Club Admin (Leo Club)**: Event and template manager, issues single/batch certificates, reissues/revokes.
4. **Public-Organization Club Admin**: Self-serve onboarded org; templates require district admin approval.
5. **District Admin**: Onboards clubs, invites club admins, monitors district totals, and approves public-org templates.
6. **UOM Club Admin (Platform Operator)**: Standard `club_admin` on club `UOM` with access to `/admin/operators` and `/admin/reports` (per-club counts only).

---

## 0. Shared Routing & Authentication

1. **Marketing & Information**: `/` (how it works, FAQ, about, privacy).
2. **Authentication**: `/login` (login, signup, password reset).
3. **Routing Hub (`/continue`)**:
   - `club_admin` → `/admin`
   - `district_admin` → `/admin/district`
   - Recipient / any other role → `/claim`
4. **MFA Gate**: Club and District admins without MFA configured are routed to `/admin/mfa` before entering dashboard functions.
5. **Theme**: Light / dark mode toggle.

---

## 1. Anyone (No Account) — Check a Certificate

End-to-end: **QR or link → live DB result**.

1. Scan the QR or open `/v/[id]?t=...`.
2. Type an ID on the home verify form (still needs the token in the link).
3. **Valid Outcome**: Shows recipient name, club, event, issue date, role/achievement, and status. No private contact details (email/phone).
4. **Revoked Outcome**: Shows only: “This certificate has been revoked.”
5. **Invalid Outcome**: Displayed if ID or HMAC token is invalid or tampered with.
6. Copy check link / print result page.
7. Call to action: “Recipient: sign in to download or share” (no public PDF download).
8. Club Portal: `/o/[slug]` (branding, issued certificate count, public cert listing, verify form).
9. Opted-in Recipient Profile: `/u/[slug]` (credential list with verify buttons; no direct PDF downloads).
10. Dynamic Open Graph images: `/api/og/verify` and `/api/og/profile`.
11. Open Badges 3.0: `GET /api/credentials/[id]/badge?t=...` (HMAC token required).
12. Security: Upstash rate limiting (fail-closed in production).

**Cannot**: Download PDFs, share directly to LinkedIn, or access admin portals.

---

## 2. Recipient — Claim, Download & Share

End-to-end: **email arrives → sign in → claim → PDF / flyer / LinkedIn / optional public profile**.

1. Receive issuance email via Resend with public check link and invitation to claim.
2. Sign in with the **same email** specified on the certificate.
3. Access `/claim` to claim certificates bound to that email address.
4. View private list of claimed certificates.
5. **Download PDF**: Secured download requiring active matching recipient session + valid HMAC.
6. **Share Flyer**: Dynamic OG image export.
7. **Share on LinkedIn**: Offsite sharing linking to `/u/[slug]` or verify URL.
8. **Copy About Text**: Pre-formatted text snippet.
9. **Public Profile Toggle**: Opt-in public profile at `/u/[slug]` (PDPA compliant; off by default).
10. **Unlist Certs**: Hide individual certificates from public profile without affecting verification at `/v/*`.

---

## 3. Club Admin (Leo Club)

End-to-end: **event → design → approve → issue → email → manage**.

### Setup
- Invited or seeded; completes login and MFA.
- Dashboard at `/admin`: Issuance counts, quota usage, recent audit log.
- Settings at `/admin/settings`: Name, slug, logo URL, colors, tagline.

### Events & Templates
- Create and edit events (name, date, description).
- Create templates attached to an event:
  - Kind: `certificate` or `service_letter`.
  - Background image: PNG or JPEG (max 5 MB).
  - Fabric.js designer: Drag recipient name, role, achievement, date, certificate ID, QR code, signature stamps (`signature1`/`signature2`).
  - Approval: Standard Leo club templates are approved on create. Can approve drafts or revert rejected templates to draft.

### Issuance
- Single Issue: Pick event and template, enter details (`/admin/issue`).
- Bulk CSV/XLSX: Upfront validation of all rows; background processing via Inngest.
- Idempotency: Re-running imports skips already-issued rows for that template.
- Multi-template issuance: Can issue a second template (e.g. certificate + service letter) for the same event and person.
- Enforces monthly quota (`monthlyCertLimit`).
- Transactional issuance emails delivered via Resend.

### Certificate Management
- Search, filter, inspect issued certificates.
- Revoke: Sets revocation reason and actor; database record is never deleted.
- Reissue: Re-renders PDF, increments `tokenVersion`, invalidates old QR codes and links.
- Resend issuance email.
- Operator PDF download (same-club internal copy).
- Export verification URLs to CSV.
- View audit log at `/admin/audit`.

**Cannot**: Create district admins, view or query other clubs' certificate tables, or delete certificate rows.

---

## 4. Public-Organization Club Admin

Same as Leo Club Admin, with governance checks:
1. Self-serve signup at `/signup` (org name, code, admin credentials).
2. Templates start in `draft` status and require District Admin review.
3. If rejected, can revert to draft, revise, and resubmit.

---

## 5. District Admin

End-to-end: **onboard clubs → invite club admins → review public-org templates → watch district totals**.

1. Provisioned by UOM; signs in and completes MFA.
2. Lands on `/admin/district`.
3. Creates clubs within their assigned district.
4. Invites club admins (via Supabase invite or binding existing Auth account).
5. Monitors district overview: clubs, events, total issued/revoked certificates, summary analytics.
6. Reviews public-org templates: approves or rejects with feedback notes.
7. If assigned a `clubId`, can access that specific club's issuance/event tools.

**Cannot**: Create other district admins, open another club's certificate table, or access UOM operator/reports pages.

---

## 6. UOM Club Admin (Platform Operator)

- Standard `club_admin` on club `UOM` (not a distinct database role).
- Primary home remains `/admin` with standard club administration capabilities for UOM events and templates.
- **Operator-Exclusive Views**:
  1. **Operators (`/admin/operators`)**:
     - Create districts (name and code).
     - Invite district admins (assigned to a district and club).
     - List and disable district admins (`disabledAt` prevents admin authentication).
  2. **Reports (`/admin/reports`)**:
     - High-level cross-club aggregate counts only (club, code, event count, total issued, total revoked).
     - Never displays recipient names, emails, or granular certificate records of other clubs.

---

## 7. Strict Non-Features (Do Not Implement)

- **No Official LinkedIn Certification API**: Does not use OAuth "Add to Profile" certification sync; sharing relies on offsite URL/flyer shares.
- **No Mobile Wallet Passes**: No Apple Wallet or Google Wallet pass generation.
- **No Self-Serve Billing / Payments**: Tier quotas are configured administratively.
- **No Live UI Club Switcher**: Even if remnants exist in code, keep UI club switcher removed.
- **No Cross-Club Record Browsing**: Even platform operators only see aggregate numbers in reports.
- **No Certificate Row Deletion**: Revocation flag only.
- **No Login Wall on `/v/*`**: Anyone with link + token can verify without authentication.
