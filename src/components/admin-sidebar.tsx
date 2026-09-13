"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileBadge2,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  ScrollText,
} from "lucide-react";
import { signOutAction } from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: ClipboardList },
  { href: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/admin/certificates", label: "Certificates", icon: FileBadge2 },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminSidebar({
  clubName,
  userEmail,
}: {
  clubName?: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-primary text-primary-foreground">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-sm font-bold text-accent">
          LV
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">LeoVerify</p>
          <p className="truncate text-xs text-white/60">
            {clubName ?? "Club admin"}
          </p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-white/10 p-3">
        {userEmail && (
          <p className="truncate px-3 text-xs text-white/50">{userEmail}</p>
        )}
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-2.5 px-3 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
