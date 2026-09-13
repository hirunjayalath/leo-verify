import { ClaimForm } from "@/components/claim-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ClaimPage() {
  return (
    <div className="surface-grid">
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Claim your certificates
        </h1>
        <p className="mt-2 text-muted-foreground">
          Link certificates issued to your email. Public profiles are opt-in and
          private by default.
        </p>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Verify email ownership</CardTitle>
            <CardDescription>
              When Supabase Auth is configured, sign in with the same email first.
              Local AUTH_DEV_BYPASS allows claim without a session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
