import { ContentPage, contentMetadata } from "@/components/content-page";

export const metadata = contentMetadata(
  "How it works",
  "Issue a template-based certificate, share the QR, and verify against the live database.",
);

export default function HowItWorksPage() {
  return (
    <ContentPage
      title="How it works"
      description="Three steps from club admin issuance to independent public verification."
    >
      <ol className="list-decimal space-y-6 pl-5">
        <li>
          <p className="font-semibold">Issue</p>
          <p className="mt-1 text-muted-foreground">
            Club admins create an event, upload a certificate background, place
            fields in the designer, and issue one certificate or import a CSV
            roster. Each record gets a human-readable ID and an unguessable
            verification token.
          </p>
        </li>
        <li>
          <p className="font-semibold">Share the QR</p>
          <p className="mt-1 text-muted-foreground">
            The PDF embeds a QR code that opens the verification URL. Recipients
            can also receive an email with the verify link and a gated PDF
            download when email is configured.
          </p>
        </li>
        <li>
          <p className="font-semibold">Verify live</p>
          <p className="mt-1 text-muted-foreground">
            Anyone opens the link and sees the live database status — valid,
            revoked, or invalid. No login is required. Revoked certificates show
            only that they have been revoked.
          </p>
        </li>
      </ol>
      <h2 className="text-lg font-semibold tracking-tight">Why this model</h2>
      <p>
        Clubs change leadership often. Keeping the source of truth in a shared
        database means certificates outlive any single laptop or email inbox, and
        mistakes can be revoked without pretending the PDF never existed.
      </p>
    </ContentPage>
  );
}
