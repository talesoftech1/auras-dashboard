"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessagesSquare,
  HelpCircle,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: typeof Home;
  exact?: boolean;
};

const items: NavItem[] = [
  { href: "/dashboard", label: "Home", short: "Home", icon: Home, exact: true },
  {
    href: "/dashboard/conversations",
    label: "Conversations",
    short: "Chats",
    icon: MessagesSquare,
  },
  {
    href: "/dashboard/unanswered",
    label: "Unanswered",
    short: "Queue",
    icon: HelpCircle,
  },
  {
    href: "/dashboard/knowledge",
    label: "Knowledge",
    short: "Knowledge",
    icon: FileText,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    short: "Settings",
    icon: Settings,
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/**
 * Sidebar nav links for the desktop layout. Highlights the active route.
 */
export function DesktopNavItems() {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/**
 * Fixed bottom tab bar shown on mobile only. Five icon+label tabs with active
 * highlight. Sits above iOS safe-area inset so content isn't hidden behind
 * the home indicator.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      aria-label="Primary"
    >
      <ul
        className="mx-auto grid max-w-screen-sm grid-cols-5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="contents">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                <span className="truncate">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
