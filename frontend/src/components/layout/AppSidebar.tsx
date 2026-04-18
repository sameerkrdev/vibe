import { NavLink } from "react-router";
import { Home, Compass, PlusCircle, Wallet, Bell, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { LogOut } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

const navItems = [
  { to: "/", icon: Home, label: "Dashboard", end: true },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/bets/create", icon: PlusCircle, label: "Create Bet" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function AppSidebar() {
  const user = useAuthStore((s) => s.user);
  const { data: count = 0 } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; count: number }>("/api/notifications/unread-count");
      return res.data.count;
    },
    refetchInterval: 30_000,
  });

  const initials = user?.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const qc = useQueryClient();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const logout = useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => {
      setUser(null);
      qc.clear();
      void navigate("/auth/login");
    },
  });

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen border-r bg-sidebar sticky top-0">
      <div className="p-4 border-b">
        <span className="flex items-center gap-2 font-bold text-primary text-lg">
          <span>⚡</span>
          <span>StakeStreak</span>
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )
            }
          >
            <div className="relative">
              <Icon className="h-4 w-4" />
              {to === "/notifications" && count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
          </div>
          <button
            title="Log Out"
            className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-md hover:bg-destructive/10"
            onClick={() => logout.mutate()}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
