import {
  AuthShell,
  AuthShellFootnote,
  AuthShellLink,
} from "@/components/public/auth-shell";
import { SignupForm } from "@/components/public/signup-form";
import { getSupabaseAuthUser } from "@/lib/auth";

export default async function SignupPage() {
  const auth = await getSupabaseAuthUser();

  return (
    <AuthShell
      title="Create an organization"
      description="Create a club account. Design templates, issue certificates, and put a check page online."
      asideLabel="Sign up"
      illustration="register"
    >
      <SignupForm signedInEmail={auth?.email ?? null} />
      <AuthShellFootnote>
        Already have an account?{" "}
        <AuthShellLink href="/login">Sign in</AuthShellLink>
      </AuthShellFootnote>
      <AuthShellFootnote className="mt-2">
        Recipient only?{" "}
        <AuthShellLink href="/login?mode=signup">Create a recipient account</AuthShellLink>
      </AuthShellFootnote>
    </AuthShell>
  );
}
