import { AdminMfaSetup } from "@/components/admin-mfa-setup";
import {
  getAuthenticatorAssuranceLevel,
  requireUser,
} from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminMfaPage() {
  const user = await requireUser();
  if (user.role !== "club_admin" && user.role !== "district_admin") {
    redirect("/claim");
  }

  const level = await getAuthenticatorAssuranceLevel();
  if (level === "aal2") {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-lg">
      <AdminMfaSetup initialLevel={level} />
    </div>
  );
}
