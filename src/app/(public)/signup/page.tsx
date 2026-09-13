import Link from "next/link";
import { SignupForm } from "@/components/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="surface-grid">
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Create an organization
        </h1>
        <p className="mt-2 text-muted-foreground">
          Self-serve signup for public clubs and organizations. Free plan includes
          a monthly certificate entitlement (Stripe billing can plug into{" "}
          <code className="text-xs">Club.plan</code> later).
        </p>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Organization details</CardTitle>
            <CardDescription>
              Create the admin user in Supabase Auth first, then paste the UUID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm />
          </CardContent>
        </Card>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
