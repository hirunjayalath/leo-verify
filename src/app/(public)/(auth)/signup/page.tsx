import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { getSupabaseAuthUser } from "@/lib/auth";

export default async function SignupPage() {
  const auth = await getSupabaseAuthUser();

  return (
    <AuthShell
      title="Create an organization"
      description="Create a free organization (50 certificates/month). Design templates, bulk-issue credentials, and publish a white-label portal at /o/your-slug."
    >
      <SignupForm signedInEmail={auth?.email ?? null} />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline-offset-4 hover:underline">
          Sign in
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
