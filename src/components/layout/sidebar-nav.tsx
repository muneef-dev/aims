"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  BrainCircuit,
  FileBarChart,
  Bell,
  Users,
  LogOut,
  MessageSquare,
  ShieldAlert,
  Clock,
  ShoppingCart,
  Sun,
  GitCompare,
  Target,
  CalendarRange,
  PieChart,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: Package },
  { label: "Inventory", href: "/inventory", icon: Warehouse },
  { label: "AI Forecasting", href: "/forecasting", icon: BrainCircuit, ownerOnly: true },
  { label: "AI Assistant", href: "/chatbot", icon: MessageSquare },
  { label: "Anomaly Detection", href: "/anomaly-detection", icon: ShieldAlert, ownerOnly: true },
  { label: "Stockout Timeline", href: "/stockout-timeline", icon: Clock, ownerOnly: true },
  { label: "Reorder Suggestions", href: "/reorder-suggestions", icon: ShoppingCart, ownerOnly: true },
  { label: "Seasonal Trends", href: "/seasonal-trends", icon: Sun, ownerOnly: true },
  { label: "Demand-Supply Gap", href: "/demand-supply-gap", icon: GitCompare, ownerOnly: true },
  { label: "Forecast Accuracy", href: "/forecast-accuracy", icon: Target, ownerOnly: true },
  { label: "Multi-Period Forecast", href: "/multi-forecast", icon: CalendarRange, ownerOnly: true },
  { label: "Category Analytics", href: "/category-analytics", icon: PieChart, ownerOnly: true },
  { label: "Reports", href: "/reports", icon: FileBarChart, ownerOnly: true },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Users", href: "/users", icon: Users, ownerOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarNavProps {
  role: string;
  onNavigate?: () => void;
}

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.ownerOnly || role === "OWNER"
  );

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Package className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">AIMS</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-l-2 border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
