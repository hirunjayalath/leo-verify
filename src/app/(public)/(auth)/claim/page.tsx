import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ClaimForm } from "@/components/claim-form";
import { getRecipientDashboard } from "@/app/(public)/(auth)/claim/actions";
import { getSupabaseAuthUser } from "@/lib/auth";

export default async function ClaimPage() {
  const auth = await getSupabaseAuthUser();
  const dashboard = auth ? await getRecipientDashboard() : null;

  return (
    <AuthShell
      title="Claim your certificates"
      description="Sign in with the email used on your certificates, then link them to a private profile you can opt into publishing."
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
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Club admin?{" "}
        <Link href="/login" className="font-medium underline-offset-4 hover:underline">
          Sign in to dashboard
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to public site
        </Link>
      </p>
    </AuthShell>
  );
}
