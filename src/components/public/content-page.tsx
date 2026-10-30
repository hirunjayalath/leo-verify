import type { Metadata } from "next";
import Link from "next/link";

export function ContentPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="site-page-shell min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#0c2340_0%,#164194_72%,#1e40af_100%)] px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[42px] border-white/[0.05]" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffc72c]">
            LeoVerify guide
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/68 sm:text-lg">{description}</p>
        </header>
        <div className="site-section-card prose-leo mt-6 space-y-6 p-6 text-sm leading-relaxed text-foreground sm:p-9 sm:text-base">
          {children}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/#verify" className="font-medium text-primary underline-offset-4 hover:underline">
            Verify a certificate
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}

export function contentMetadata(
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    openGraph: { title: `${title} · LeoVerify`, description },
  };
}
