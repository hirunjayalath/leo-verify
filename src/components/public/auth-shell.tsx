import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/public/brand-logo";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      <aside className="auth-brand-panel relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <Link href="/" className="inline-flex">
            <BrandLockup
              size={36}
              wordmarkClassName="text-white"
              priority
            />
          </Link>
          <h1 className="mt-16 max-w-md text-3xl font-semibold tracking-tight leading-snug">
            Issue a certificate. Anyone with the link can check it.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Scan the QR. The site is the record, not the PDF.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-white/80">
          {[
            "Anyone can check a QR. No account needed.",
            "Club admins see their own club only.",
            "CSV import will not create the same row twice.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <div className="surface-grid flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8">
            <Link href="/" className="inline-flex">
              <BrandLockup size={32} priority />
            </Link>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-float sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
