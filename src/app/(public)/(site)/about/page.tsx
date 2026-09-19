import { ContentPage, contentMetadata } from "@/components/public/content-page";

export const metadata = contentMetadata(
  "About",
  "LeoVerify is operated by Leo Club of University of Moratuwa for trusted Leo Club certificates.",
);

export default function AboutPage() {
  return (
    <ContentPage
      title="About LeoVerify"
      description="A credentialing platform run by Leo Club of University of Moratuwa for clubs that need certificates the public can trust."
    >
      <p>
        LeoVerify issues and archives certificates for Leo Club events. Anyone with
        a certificate link or QR can check authenticity without logging in.
      </p>
      <p>
        <strong>The database record is authoritative.</strong> A PDF is only a
        convenience copy. If a downloaded file disagrees with the live verification
        page, trust the page.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">Who operates this</h2>
      <p>
        Leo Club of University of Moratuwa (District 306 A2) operates the platform
        and can onboard other Leo clubs in the district. Public organization signup
        exists for other groups under operator policy.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">What we show publicly</h2>
      <p>
        Public verification shows only what is needed to confirm authenticity —
        recipient name, club, event, date, role or achievement, and status. Email
        addresses and contact details are never shown on the verify page.
      </p>
    </ContentPage>
  );
}
