import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create organization",
  description:
    "Self-serve signup for public clubs and organizations on LeoVerify.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
