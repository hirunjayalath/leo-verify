import { AdminMfaSetup } from "@/components/admin/admin-mfa-setup";
import {
  getAuthenticatorAssuranceLevel,
  listTotpFactors,
  requireUser,
} from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminMfaPage() {
  const user = await requireUser();
  if (user.role !== "club_admin" && user.role !== "district_admin") {
    redirect("/claim");
  }

  const [level, factors] = await Promise.all([
    getAuthenticatorAssuranceLevel(),
    listTotpFactors(),
  ]);
  if (level === "aal2") {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-lg">
      <AdminMfaSetup initialLevel={level} initialFactors={factors} />
    </div>
  );
}
