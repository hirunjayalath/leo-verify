import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim certificates",
  description:
    "Link certificates issued to your email to a private LeoVerify profile.",
  robots: { index: false, follow: false },
};

export default function ClaimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
