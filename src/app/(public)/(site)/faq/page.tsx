import { ContentPage, contentMetadata } from "@/components/content-page";

export const metadata = contentMetadata(
  "FAQ",
  "Common questions about LeoVerify certificates, tokens, revoke, claim, and downloads.",
);

const faqs = [
  {
    q: "What is a verification token?",
    a: "A long secret that travels with the certificate QR or share link. The human-readable ID alone is not enough to look up a record — both ID and token are required.",
  },
  {
    q: "I lost my PDF. Can I download it again?",
    a: "Open the original verification link from email or QR. If the certificate is still issued, use Download PDF on the verify page. Club admins can also reissue a fresh PDF and link.",
  },
  {
    q: "What does “revoked” mean?",
    a: "The club marked the certificate invalid (for example issued in error). The public page shows only that it has been revoked — no further detail.",
  },
  {
    q: "What is the difference between verify and claim?",
    a: "Verify is public and confirms one certificate. Claim is for recipients who sign in with the email on their certificates to link them to a personal profile and optional public listing.",
  },
  {
    q: "Why does the verify page disagree with my PDF?",
    a: "Trust the verify page. The database is authoritative; the PDF is a convenience copy and may be outdated after a revoke or reissue.",
  },
  {
    q: "How do other clubs join?",
    a: "District operators can create a club and link a club admin (Auth user UUID). Public organization signup is available when enabled for your deployment.",
  },
];

export default function FaqPage() {
  return (
    <ContentPage
      title="FAQ"
      description="Short answers for recipients, verifiers, and club admins."
    >
      <dl className="space-y-8">
        {faqs.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold text-foreground">{item.q}</dt>
            <dd className="mt-2 text-muted-foreground">{item.a}</dd>
          </div>
        ))}
      </dl>
    </ContentPage>
  );
}
