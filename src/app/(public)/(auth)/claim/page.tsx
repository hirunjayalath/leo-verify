import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AuthShell,
  AuthShellFootnote,
  AuthShellLink,
} from "@/components/public/auth-shell";
import { ClaimForm } from "@/components/public/claim-form";
import { RecipientSignOut } from "@/components/public/recipient-sign-out";
import { getRecipientDashboard } from "@/app/(public)/(auth)/claim/actions";
import { getSessionUser, getSupabaseAuthUser } from "@/lib/auth";
import { homePathForRole, isAdminRole } from "@/lib/auth-redirect";

function initials(name: string | null | undefined) {
  if (!name) return "LV";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default async function ClaimPage() {
  const session = await getSessionUser();
  if (session && isAdminRole(session.role)) {
    redirect(homePathForRole(session.role));
  }

  const auth = await getSupabaseAuthUser();
  const dashboard = auth ? await getRecipientDashboard() : null;
  const initialSettings = dashboard?.recipient
    ? {
        slug: dashboard.recipient.slug,
        publicProfile: dashboard.recipient.publicProfile,
        certificates: dashboard.recipient.certificates,
      }
    : null;

  if (!auth) {
    return (
      <AuthShell
        title="Claim your certificates"
        description="Sign in with the email on your certificates. They stay on a private profile unless you publish it."
        asideLabel="Claim"
        illustration="verify"
      >
        <ClaimForm authEmail={null} initialSettings={null} />
        <AuthShellFootnote>
          Club admin?{" "}
          <AuthShellLink href="/login">Sign in to dashboard</AuthShellLink>
        </AuthShellFootnote>
        <AuthShellFootnote className="mt-2">
          <AuthShellLink href="/">Back to home</AuthShellLink>
        </AuthShellFootnote>
      </AuthShell>
    );
  }

  const displayName =
    dashboard?.recipient?.name ||
    dashboard?.recipient?.certificates[0]?.recipientName ||
    auth.email.split("@")[0];

  return (
    <div className="site-page-shell min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Back to home
          </Link>
          <RecipientSignOut />
        </div>
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#0c2340_0%,#164194_72%,#1e40af_100%)] p-6 text-white shadow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[42px] border-white/[0.05]" />
          <div className="relative flex items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ffc72c] text-lg font-bold text-[#0c2340] shadow-lg"
            aria-hidden
          >
            {initials(displayName)}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ffd95e]">
              Your certificates
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {displayName}
            </h1>
            <p className="mt-2 text-sm text-white/65">{auth.email}</p>
          </div>
          </div>
        </div>

        <div className="mt-6">
          <ClaimForm
            authEmail={auth.email}
            initialSettings={initialSettings}
            displayName={dashboard?.recipient?.name ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
