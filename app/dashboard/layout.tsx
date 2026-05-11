import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { DesktopNavItems, MobileBottomNav } from "./nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden on mobile, where MobileBottomNav takes over */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/20 p-4 md:flex">
        <div className="mb-8 px-2">
          <Link href="/dashboard" className="text-lg font-semibold">
            Auras
          </Link>
        </div>
        <nav className="space-y-1">
          <DesktopNavItems />
        </nav>
        <div className="mt-auto pt-4">
          <div className="rounded-md border bg-background p-3 text-xs">
            <div className="truncate font-medium">{user.email}</div>
            <form action="/auth/signout" method="post" className="mt-2">
              <button
                type="submit"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main column. On mobile it gets a sticky top bar + bottom-bar padding;
          on desktop it's just the content area. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <Link href="/dashboard" className="text-base font-semibold">
            Auras
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </form>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
