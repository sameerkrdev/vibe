import { Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Toaster } from "@/components/ui/sonner";

const UnauthorizedLayout = () => {
  useAuth();

  return (
    <AuthGuard requireAuth={false}>
      <div className="dark min-h-screen bg-background">
        <Outlet />
        <Toaster richColors position="top-right" />
      </div>
    </AuthGuard>
  );
};

export default UnauthorizedLayout;
