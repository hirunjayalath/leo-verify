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
    <div className="surface-grid">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Back to home
          </Link>
          <RecipientSignOut />
        </div>
        <div className="flex items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-accent shadow-elevated"
            aria-hidden
          >
            {initials(displayName)}
          </span>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Your certificates
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
              {displayName}
            </h1>
            <p className="mt-2 text-muted-foreground">{auth.email}</p>
          </div>
        </div>

        <div className="mt-10">
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
