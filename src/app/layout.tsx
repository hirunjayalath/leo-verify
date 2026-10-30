import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    "Issue Leo Club certificates and let anyone check them. Run by Leo Club of University of Moratuwa.",
  applicationName: "LeoVerify",
  openGraph: {
    type: "website",
    locale: "en_LK",
    siteName: "LeoVerify",
    title: "LeoVerify, live certificate checks",
    description:
      "Anyone can check a Leo Club certificate. No account needed.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeoVerify, live certificate checks",
    description:
      "Anyone can check a Leo Club certificate. No account needed.",
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
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var root=document.documentElement;root.classList.remove("dark");root.style.colorScheme="light";try{localStorage.removeItem("leoverify-theme")}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
