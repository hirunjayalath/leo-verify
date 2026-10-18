import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { BrandLockup } from "@/components/public/brand-logo";
import { CredentialMark } from "@/components/ui/credential-mark";

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
    <div className="grid min-h-screen flex-1 lg:grid-cols-12 bg-background">
      {/* Brand Hero Panel */}
      <aside className="auth-brand-panel relative hidden overflow-hidden text-white lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:p-14">
        {/* Ambient specular highlight */}
        <div
          className="pointer-events-none absolute -left-12 -top-12 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <Link href="/" className="inline-flex transition-opacity hover:opacity-90">
            <BrandLockup
              size={36}
              wordmarkClassName="text-white"
              priority
            />
          </Link>

          <div className="mt-16">
            <CredentialMark size="sm" className="mb-6" />
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent backdrop-blur-md">
              <Sparkles className="h-3 w-3" />
              <span>District 306 A2 Security Standard</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] leading-snug text-white/95 xl:text-4xl">
              Cryptographic integrity for every credential.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              The live online database is the ground truth. No forged PDF or
              tampered printout can falsify the record.
            </p>
          </div>
        </div>

        <div className="relative border-t border-white/10 pt-8">
          <ul className="space-y-3.5 text-xs font-medium text-white/80">
            {[
              "Zero-account public verification via QR code",
              "PostgreSQL Row-Level Security (RLS) tenant isolation",
              "Idempotent CSV and Excel roster imports",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form Content Side */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8 lg:col-span-7 lg:py-16 bg-muted/20">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to home</span>
            </Link>
            <div className="lg:hidden">
              <BrandLockup size={28} priority />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-foreground sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {description}
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
