import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/public/auth-shell";
import { ClaimForm } from "@/components/public/claim-form";
import { getRecipientDashboard } from "@/app/(public)/(auth)/claim/actions";
import { getSessionUser, getSupabaseAuthUser } from "@/lib/auth";
import { homePathForRole, isAdminRole } from "@/lib/auth-redirect";

export default async function ClaimPage() {
  const session = await getSessionUser();
  if (session && isAdminRole(session.role)) {
    redirect(homePathForRole(session.role));
  }

  const auth = await getSupabaseAuthUser();
  const dashboard = auth ? await getRecipientDashboard() : null;

  return (
    <AuthShell
      title="Claim your certificates"
      description="Sign in with the email on your certificates. They stay on a private profile unless you publish it."
    >
      <ClaimForm
        authEmail={auth?.email ?? null}
        initialSettings={
          dashboard?.recipient
            ? {
                slug: dashboard.recipient.slug,
                publicProfile: dashboard.recipient.publicProfile,
                certificates: dashboard.recipient.certificates,
              }
            : null
        }
      />
      {!auth && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Club admin?{" "}
          <Link href="/login" className="font-medium underline-offset-4 hover:underline">
            Sign in to dashboard
          </Link>
        </p>
      )}
      <p className="mt-2 text-center text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
