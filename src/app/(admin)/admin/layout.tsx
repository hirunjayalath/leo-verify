import { AdminSidebar } from "@/components/admin-sidebar";
import { requireClubAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClubAdmin();

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <AdminSidebar
        clubName={user.club?.name ?? user.district?.name}
        userEmail={user.email}
        showDistrict={user.role === "district_admin"}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-border bg-card px-6">
          <p className="text-sm text-muted-foreground">
            {user.club?.name ?? "LeoVerify"} ·{" "}
            {user.role === "district_admin" ? "District admin" : "Phase 0"}
          </p>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}
