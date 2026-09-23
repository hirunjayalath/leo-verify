import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create organization",
  description:
    "Create a club account on LeoVerify.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
