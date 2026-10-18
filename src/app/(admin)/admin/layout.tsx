import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminBreadcrumbs, AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { isUomPlatformAdmin, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function initials(email?: string | null, name?: string | null) {
  const source = name || email || "A";
  const parts = source.replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.role !== "club_admin" && user.role !== "district_admin") {
    redirect("/login");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (
    pathname.startsWith("/admin/district") &&
    user.role !== "district_admin"
  ) {
    redirect("/admin");
  }
  if (
    (pathname.startsWith("/admin/operators") ||
      pathname.startsWith("/admin/reports")) &&
    !isUomPlatformAdmin(user)
  ) {
    redirect("/admin");
  }

  const chip = initials(user.email, user.name);
  const hasClub = Boolean(user.clubId);

  return (
    <div className="admin-shell flex h-screen min-h-0 flex-1 overflow-hidden bg-background">
      <AdminSidebar
        clubName={user.club?.name ?? user.district?.name}
        userEmail={user.email}
        userName={user.name}
        showDistrict={user.role === "district_admin"}
        showPlatform={isUomPlatformAdmin(user)}
        showClubNav={hasClub}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-4 border-b border-border/80 bg-background/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <AdminBreadcrumbs />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-none">
                {user.name || user.email}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {user.role === "district_admin" ? "District admin" : "Club admin"}
              </p>
            </div>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background text-xs font-semibold shadow-sm"
              aria-hidden
            >
              {chip}
            </span>
          </div>
        </header>
        <main className="admin-content min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="admin-workspace mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
