"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileBadge2,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Map,
  Shield,
  BarChart3,
  Menu,
  ScrollText,
  Send,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";
import { signOutAction } from "@/app/(admin)/admin/actions";
import { BrandMark } from "@/components/public/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const clubNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/issue", label: "Issue", icon: Send },
  { href: "/admin/events", label: "Events", icon: ClipboardList },
  { href: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/admin/certificates", label: "Certificates", icon: FileBadge2 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

function initials(email?: string | null, name?: string | null) {
  const source = name || email || "A";
  const parts = source.replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function SidebarNav({
  pathname,
  showDistrict,
  showPlatform,
  showClubNav = true,
  onNavigate,
}: {
  pathname: string;
  showDistrict?: boolean;
  showPlatform?: boolean;
  showClubNav?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {showPlatform && (
        <div className="mb-2">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            UOM
          </p>
          <Link
            href="/admin/operators"
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                pathname.startsWith("/admin/operators")
                ? "bg-white/12 text-white shadow-sm"
                : "text-white/65 hover:bg-white/8 hover:text-white",
            )}
          >
            <Shield className="h-4 w-4" aria-hidden />
            Operators
          </Link>
          <Link
            href="/admin/reports"
            onClick={onNavigate}
            className={cn(
              "relative mt-0.5 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                pathname.startsWith("/admin/reports")
                ? "bg-white/12 text-white shadow-sm"
                : "text-white/65 hover:bg-white/8 hover:text-white",
            )}
          >
            <BarChart3 className="h-4 w-4" aria-hidden />
            Reports
          </Link>
        </div>
      )}
      {showDistrict && (
        <div className="mb-2">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            District
          </p>
          <Link
            href="/admin/district"
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname.startsWith("/admin/district")
                ? "bg-white/12 text-white shadow-sm"
                : "text-white/65 hover:bg-white/8 hover:text-white",
            )}
          >
            {pathname.startsWith("/admin/district") && (
              <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-white" />
            )}
            <Map className="h-4 w-4" aria-hidden />
            District
          </Link>
        </div>
      )}
      {showClubNav && (
        <>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Club
          </p>
          <div className="flex flex-col gap-0.5">
            {clubNav.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                          "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                            ? "bg-white/12 text-white shadow-sm"
                            : "text-white/65 hover:bg-white/8 hover:text-white",
                  )}
                >
                  {active && (
                    <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-white" />
                  )}
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export function AdminSidebar({
  clubName,
  userEmail,
  userName,
  showDistrict,
  showPlatform,
  showClubNav = true,
}: {
  clubName?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  showDistrict?: boolean;
  showPlatform?: boolean;
  showClubNav?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const chip = initials(userEmail, userName);

  const panel = (
    <aside className="flex h-full min-h-screen w-72 shrink-0 flex-col bg-admin-rail text-admin-rail-foreground shadow-lg lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:h-screen">
      <div className="flex min-h-14 items-center gap-3 border-b border-white/10 px-5">
          <BrandMark size={32} className="rounded-sm shadow-sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">LeoVerify</p>
          <p className="truncate text-[11px] uppercase tracking-[0.08em] text-white/50">
            {clubName ?? "Club admin"}
          </p>
        </div>
        <button
          type="button"
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-sm text-white/70 hover:bg-white/8 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-4" aria-label="Admin">
        <SidebarNav
          pathname={pathname}
          showDistrict={showDistrict}
          showPlatform={showPlatform}
          showClubNav={showClubNav}
          onNavigate={() => setMobileOpen(false)}
        />
      </nav>
      <div className="sticky bottom-0 z-10 shrink-0 space-y-3 border-t border-white/10 bg-admin-rail p-4">
        <div className="flex items-center gap-3 rounded-md bg-white/7 px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/12 text-xs font-semibold text-white/85">
            {chip}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white/90">
              {userName || userEmail || "Admin"}
            </p>
            {userEmail && userName && (
              <p className="truncate text-[11px] text-white/50">{userEmail}</p>
            )}
          </div>
        </div>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-2.5 px-3 text-white/65 hover:bg-white/8 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        className="fixed bottom-4 left-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-md bg-admin-rail text-white shadow-float lg:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden w-72 shrink-0 lg:block">{panel}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 h-full shadow-float">{panel}</div>
        </div>
      )}
    </>
  );
}

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const prev = segments[i - 1];
    let label =
      seg === "admin" ? "Admin" : seg.charAt(0).toUpperCase() + seg.slice(1);
    // Hide raw cuids on template edit routes
    if (prev === "templates" && seg !== "edit" && /^[a-z0-9]{20,}$/i.test(seg)) {
      label = "Template";
    }
    if (seg === "edit") label = "Edit template";
    return {
      label,
      href: "/" + segments.slice(0, i + 1).join("/"),
      current: i === segments.length - 1,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground/50">/</span>}
          {crumb.current ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
