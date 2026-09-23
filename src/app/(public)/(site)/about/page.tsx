import { ContentPage, contentMetadata } from "@/components/public/content-page";

export const metadata = contentMetadata(
  "About",
  "LeoVerify is run by Leo Club of University of Moratuwa.",
);

export default function AboutPage() {
  return (
    <ContentPage
      title="About LeoVerify"
      description="Leo Club of University of Moratuwa runs this site so clubs can issue certificates people can check."
    >
      <p>
        LeoVerify issues and keeps certificates for Leo Club events. Anyone with
        the link or QR can check a certificate without logging in.
      </p>
      <p>
        <strong>If the PDF and this site disagree, believe the site.</strong> The
        PDF is just a copy. A revoke or reissue updates the page, not the old
        file.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">Who runs this</h2>
      <p>
        Leo Club of University of Moratuwa (District 306 A2) runs the site and
        can add other Leo clubs in the district. Other groups can sign up when
        the operator allows it.
      </p>
      <h2 className="text-lg font-semibold tracking-tight">What we show in public</h2>
      <p>
        A public check shows name, club, event, date, role or achievement, and
        status. It never shows email or phone.
      </p>
    </ContentPage>
  );
}
