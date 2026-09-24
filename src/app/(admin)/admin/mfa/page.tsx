import { redirect } from "next/navigation";

/** Old bookmark — MFA is no longer required. */
export default function AdminMfaRedirectPage() {
  redirect("/admin");
}
