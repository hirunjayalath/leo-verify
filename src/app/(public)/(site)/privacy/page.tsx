import { ContentPage, contentMetadata } from "@/components/content-page";

export const metadata = contentMetadata(
  "Privacy",
  "What LeoVerify shows on public verification — and what it never exposes.",
);

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy"
      description="Public verification is open by design, with a minimal data surface."
    >
      <h2 className="text-lg font-semibold tracking-tight">
        Public certificate check
      </h2>
      <p>
        The verification page is public so employers and community members can
        confirm authenticity without an account. It may show: recipient name,
        club, event, issue date, role or achievement, and status (issued or
        revoked).
      </p>
      <p>
        It does <strong>not</strong> show email, phone number, or club roster
        lists.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">
        Opt-in public profiles
      </h2>
      <p>
        Recipients can claim certificates and optionally publish a profile listing
        issued certificates. Profiles are private by default. Verification tokens
        are not embedded in crawlable profile HTML.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">Admin data</h2>
      <p>
        Club and district admins can see recipient emails for issuance and support.
        Those details stay inside the authenticated admin area and audit log.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
      <p>
        Questions about data on this platform:{" "}
        <a
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@leoverify.org"}`}
        >
          {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@leoverify.org"}
        </a>
        .
      </p>
    </ContentPage>
  );
}
