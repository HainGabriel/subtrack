"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { Badge } from "@/components/ui/badge";

export function SidebarNav({
  unreadNotifications,
  onNavigate,
}: {
  unreadNotifications: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.href === "/notificaciones" && unreadNotifications > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1 tabular-nums">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
