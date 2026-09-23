import { ContentPage, contentMetadata } from "@/components/public/content-page";

export const metadata = contentMetadata(
  "How it works",
  "Issue a certificate from a template, share the QR, and check it on this site.",
);

export default function HowItWorksPage() {
  return (
    <ContentPage
      title="How it works"
      description="Three steps from issue to a public check."
    >
      <ol className="list-decimal space-y-6 pl-5">
        <li>
          <p className="font-semibold">Issue</p>
          <p className="mt-1 text-muted-foreground">
            Club admins create an event, upload a background, place fields, and
            issue one certificate or import a CSV. Each record gets a readable
            ID and a token you cannot guess.
          </p>
        </li>
        <li>
          <p className="font-semibold">Share the QR</p>
          <p className="mt-1 text-muted-foreground">
            The PDF has a QR that opens the check page. Recipients can also get
            an email with the link and a PDF download.
          </p>
        </li>
        <li>
          <p className="font-semibold">Check it live</p>
          <p className="mt-1 text-muted-foreground">
            Anyone opens the link and sees the current status. Valid, revoked,
            or invalid. No login. A revoked certificate only says it has been
            revoked.
          </p>
        </li>
      </ol>
      <h2 className="text-lg font-semibold tracking-tight">Why we do it this way</h2>
      <p>
        Club boards change often. The record lives in the database, not on one
        laptop. If someone issued the wrong name, you revoke it. The old PDF
        does not disappear, and that is the point.
      </p>
    </ContentPage>
  );
}
