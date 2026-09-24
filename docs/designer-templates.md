# Certificate designer guide

Each event has its own template. Design the artwork once, upload it in **Admin → Templates**, then place the merge fields. Issuance fills those fields from the CSV roster and from the live record (date, ID, QR). The PNG is not scanned; coordinates decide where each field is drawn.

## Page size

- Canvas: **A4 landscape** (297 × 210 mm)
- Preferred export: **1684 × 1190 px** PNG (2× 842 × 595 pt)
- File type: PNG or JPEG, **5 MB or smaller**
- The PDF renderer stretches the background to 842 × 595 pt. A 16:9 image (for example 1280 × 720) will look distorted.

## What you paint vs what the app fills

| On the PNG | CSV roster | System at issue |
|---|---|---|
| Frame, title, body sentences, event title, club name or logo, signature lines | `recipientName`, `role`, `achievement` (optional), `recipientEmail` | `issueDate`, `uniqueId`, `qr` |

Email is never printed. It is used only to send the certificate.

If you paint the **event title** or **club name** on the PNG, delete the Event name / Club name fields in the designer so they are not printed twice. Starter gallery templates keep those two fields so a clone still works before you paint the event title.

Do not add extra CSV columns.

## Reserved gaps

Leave empty bands (a thin underline is fine):

1. **Recipient name** — largest type on the page (~30 pt), centered
2. **Role / position** (~15 pt)
3. **Achievement** — optional; leave a line even if some rows omit it
4. **Issue date**
5. **Certificate ID** — bottom left, small monospace
6. **QR** — bottom right, at least 78 × 78 pt, with a quiet zone (do not crowd the frame). Caption such as “Scan to verify” may be painted on the PNG

Typical starter coordinates (PDF points, origin top-left, page 842 × 595, center x = 421):

| Field | x | y | Notes |
|---|---|---|---|
| `recipientName` | 421 | 218 | 30 pt, centered |
| `role` | 421 | see family | 15 pt, centered |
| `eventName` | 421 | see family | delete if painted on the PNG |
| `achievement` | 421 | ~412 | 13 pt, optional |
| `issueDate` | 421 | 448 | 12 pt |
| `clubName` | 110 | 498 | left; delete if painted |
| `uniqueId` | 110 | 526 | 9 pt Courier |
| `qr` | 668 | 438 | 80 × 80 |

Appreciation starters put **role** at y = 308 (after “dedicated service as”) and **event** at y = 376 (after “during”). Completion starters put **event** at y = 306 (after “has successfully completed”) and **role** at y = 374 (after “in the capacity of”).

## Admin steps

1. Create the event.
2. **New template**: upload the PNG and attach it to that event — or clone a starter from the gallery.
3. Open **Edit layout**. Drag **Recipient name**, **Role**, **QR**, **Certificate ID**, and **Issue date** onto the reserved gaps. Add **Achievement** if you left a line for it.
4. Save. Preview uses the same PDF renderer as issue.
5. Issue from a CSV with columns for name, role, and optional achievement and email.

## Hierarchy (what a real certificate needs)

1. Issuer / title (“Certificate of …”)
2. Opening sentence
3. Recipient name (largest)
4. Role and event (or event baked into the artwork)
5. Date and optional signatory
6. Verification block: ID + QR + quiet zone
