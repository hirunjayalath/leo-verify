import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "LeoVerify",
    template: "%s · LeoVerify",
  },
  description:
    "Issue, archive, and verify Leo Club certificates — the database record is authoritative. Operated by Leo Club of University of Moratuwa.",
  applicationName: "LeoVerify",
  openGraph: {
    type: "website",
    locale: "en_LK",
    siteName: "LeoVerify",
    title: "LeoVerify — Live certificate verification",
    description:
      "Anyone can check a Leo Club certificate against the live database — no login required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeoVerify — Live certificate verification",
    description:
      "Anyone can check a Leo Club certificate against the live database — no login required.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
