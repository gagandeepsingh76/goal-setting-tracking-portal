"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Target } from "lucide-react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { navItems } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

export function MobileNav({ role }: { role: Session["user"]["role"] }) {
  const pathname = usePathname();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-3 top-3 h-[calc(100vh-1.5rem)] max-h-none w-[calc(100%-1.5rem)] max-w-sm translate-x-0 translate-y-0 p-0 sm:left-4 sm:top-4 sm:h-[calc(100vh-2rem)]">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
              <Target className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Goal Portal</span>
              <span className="block text-xs font-normal text-muted-foreground">Navigation</span>
            </span>
          </DialogTitle>
        </DialogHeader>
        <nav className="grid gap-1 p-3">
          {navItems[role].map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground",
                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
