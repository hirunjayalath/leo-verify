import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminBreadcrumbs, AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser, withSessionRls } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const chip = initials(user.email, user.name);
  const hasClub = Boolean(user.clubId);
  const districtId = user.districtId;
  const districtClubs =
    user.role === "district_admin" && districtId
      ? await withSessionRls(user, () =>
          prisma.club.findMany({
            where: { districtId },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          }),
        )
      : [];

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <AdminSidebar
        clubName={user.club?.name ?? user.district?.name}
        userEmail={user.email}
        userName={user.name}
        showDistrict={user.role === "district_admin"}
        showClubNav={hasClub}
        districtClubs={districtClubs}
        currentClubId={user.clubId}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6">
          <AdminBreadcrumbs />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-none">
                {user.name || user.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {user.role === "district_admin" ? "District admin" : "Club admin"}
              </p>
            </div>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-accent"
              aria-hidden
            >
              {chip}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
