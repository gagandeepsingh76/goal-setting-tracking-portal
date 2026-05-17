import type { Session } from "next-auth";
import { RoleBadge } from "@/components/layout/RoleBadge";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header({ user }: { user: Session["user"] }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNav role={user.role} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <RoleBadge role={user.role} />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
