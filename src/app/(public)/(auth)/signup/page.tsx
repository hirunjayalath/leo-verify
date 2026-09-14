import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { getSupabaseAuthUser } from "@/lib/auth";

export default async function SignupPage() {
  const auth = await getSupabaseAuthUser();

  return (
    <AuthShell
      title="Create an organization"
      description="Self-serve signup for public clubs and organizations. Free plan includes a monthly certificate entitlement."
    >
      <SignupForm signedInEmail={auth?.email ?? null} />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
