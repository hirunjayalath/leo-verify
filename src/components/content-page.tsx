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
    <div className="surface-grid">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          LeoVerify
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{description}</p>
        <div className="prose-leo mt-10 space-y-6 text-sm leading-relaxed text-foreground sm:text-base">
          {children}
        </div>
        <p className="mt-12 text-sm text-muted-foreground">
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
