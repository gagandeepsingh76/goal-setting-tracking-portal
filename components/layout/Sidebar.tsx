"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  History,
  Layers3,
  ListChecks,
  Settings2,
  Share2,
  ShieldAlert,
  Target,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";

export const navItems = {
  EMPLOYEE: [
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/goals", label: "My Goals", icon: Target },
    { href: "/reports/achievement", label: "Reports", icon: BarChart3 }
  ],
  MANAGER: [
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/goals", label: "My Goals", icon: Target },
    { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
    { href: "/team", label: "My Team", icon: Users },
    { href: "/reports/achievement", label: "Reports", icon: BarChart3 }
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/cycles", label: "Cycles", icon: ListChecks },
    { href: "/admin/thrust-areas", label: "Thrust Areas", icon: Layers3 },
    { href: "/admin/shared-goals", label: "Shared Goals", icon: Share2 },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: History },
    { href: "/admin/escalation", label: "Escalation", icon: ShieldAlert },
    { href: "/reports/achievement", label: "Achievement", icon: BarChart3 },
    { href: "/reports/completion", label: "Completion", icon: CheckCircle2 }
  ]
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-72 shrink-0 border-r bg-card/95 text-card-foreground shadow-card backdrop-blur lg:block">
      <div className="flex h-16 items-center border-b px-5">
        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Goal Portal</p>
          <p className="text-xs text-muted-foreground">AtomQuest Hackathon 1.0</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {navItems[role].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground",
                active && "bg-primary text-primary-foreground shadow-glow hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
