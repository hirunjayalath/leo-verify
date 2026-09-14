import Link from "next/link";
import { ShieldCheck } from "lucide-react";

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
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-sm font-bold text-accent">
              LV
            </span>
            <span className="text-lg font-semibold tracking-tight">LeoVerify</span>
          </Link>
          <h1 className="mt-16 max-w-md text-3xl font-semibold tracking-tight leading-snug">
            Credentials your community can trust — long after the board changes.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            The PDF is a convenience copy. The database record is authoritative.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-white/80">
          {[
            "Live QR verification — no login wall",
            "Club-scoped admin with audit trail",
            "Bulk CSV issuance with idempotent imports",
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
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-accent">
                LV
              </span>
              <span className="font-semibold">LeoVerify</span>
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
