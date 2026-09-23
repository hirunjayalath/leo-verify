import { ContentPage, contentMetadata } from "@/components/public/content-page";

export const metadata = contentMetadata(
  "Privacy",
  "What a public certificate check shows, and what it never shows.",
);

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy"
      description="Anyone can check a certificate. We keep the public details small."
    >
      <h2 className="text-lg font-semibold tracking-tight">
        Public certificate check
      </h2>
      <p>
        The check page is public so an employer or another Leo can confirm a
        certificate without an account. It may show name, club, event, issue
        date, role or achievement, and status (issued or revoked).
      </p>
      <p>
        It does <strong>not</strong> show email, phone, or a club roster.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">
        Optional public profiles
      </h2>
      <p>
        Recipients can claim certificates and, if they want, publish a profile.
        Profiles start private. Check tokens are not sitting in the public HTML
        for search engines to copy.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">Admin data</h2>
      <p>
        Club and district admins can see recipient emails so they can issue and
        help people. That stays in the signed-in admin area and the audit log.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
      <p>
        Questions about data on this site:{" "}
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
