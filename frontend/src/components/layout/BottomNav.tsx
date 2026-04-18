import { NavLink } from "react-router";
import { Home, Compass, PlusCircle, Wallet, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

const navItems = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/bets/create", icon: PlusCircle, label: "Create" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/notifications", icon: Bell, label: "Alerts" },
];

export function BottomNav() {
  const { data: count = 0 } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; count: number }>("/api/notifications/unread-count");
      return res.data.count;
    },
    refetchInterval: 30_000,
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {to === "/notifications" && count > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-medium">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </div>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
