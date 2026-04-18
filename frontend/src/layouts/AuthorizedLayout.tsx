import { Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Toaster } from "@/components/ui/sonner";

const AuthorizedLayout = () => {
  useAuth();

  return (
    <AuthGuard requireAuth>
      <div className="dark min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
            <Outlet />
          </main>
        </div>
        <BottomNav />
        <Toaster richColors position="top-right" />
      </div>
    </AuthGuard>
  );
};

export default AuthorizedLayout;
