import { ContentPage, contentMetadata } from "@/components/public/content-page";

export const metadata = contentMetadata(
  "FAQ",
  "Common questions about LeoVerify certificates, tokens, revoke, claim, and downloads.",
);

const faqs = [
  {
    q: "What is a verification token?",
    a: "A long secret that sits on the QR and share link. The readable ID is not enough on its own. You need both the ID and the token.",
  },
  {
    q: "I lost my PDF. Can I download it again?",
    a: "Sign in at /claim with the email on the certificate. Download and LinkedIn share are on that page. Anyone can still open the QR or check link to see if it is valid.",
  },
  {
    q: "What does “revoked” mean?",
    a: "The club marked the certificate invalid, for example it was issued by mistake. The public page only says it has been revoked.",
  },
  {
    q: "What is the difference between verify and claim?",
    a: "Verify is public and checks one certificate. Claim is for recipients who sign in with the email on their certificates so they can collect them on a profile.",
  },
  {
    q: "Why does the verify page disagree with my PDF?",
    a: "Believe the page. The PDF is a copy and can be old after a revoke or reissue.",
  },
  {
    q: "How do other clubs join?",
    a: "A district admin can create a club and link a club admin. Public organization signup is available when the operator turns it on.",
  },
];

export default function FaqPage() {
  return (
    <ContentPage
      title="FAQ"
      description="Short answers for recipients, people checking a certificate, and club admins."
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
