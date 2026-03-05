"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAlertsCount } from "@/hooks/use-alerts-count";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/inventory": "Inventory",
  "/forecasting": "AI Forecasting",
  "/reports": "Reports",
  "/alerts": "Alerts",
  "/users": "Users",
};

interface TopBarProps {
  userName: string;
  userRole: string;
  onMenuClick: () => void;
}

export function TopBar({ userName, userRole, onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { count: alertsCount } = useAlertsCount();

  const title =
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] ?? "AIMS";

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Page title */}
      <h1 className="text-lg font-semibold">{title}</h1>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-4">
        {/* Alert bell */}
        <Link href="/alerts">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {alertsCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px]"
              >
                {alertsCount > 99 ? "99+" : alertsCount}
              </Badge>
            )}
            <span className="sr-only">Alerts</span>
          </Button>
        </Link>

        {/* User info */}
        <div className="hidden text-right text-sm sm:block">
          <p className="font-medium">{userName}</p>
          <p className="text-muted-foreground text-xs">{userRole}</p>
        </div>
      </div>
    </header>
  );
}
