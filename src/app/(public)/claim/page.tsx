import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ClaimForm } from "@/components/claim-form";

export default function ClaimPage() {
  return (
    <AuthShell
      title="Claim your certificates"
      description="Link certificates issued to your email. Public profiles stay private until you opt in."
    >
      <ClaimForm />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already claimed?{" "}
        <Link href="/login" className="font-medium underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
