import { createBrowserRouter } from "react-router";
import RootLayout from "@/layouts/RootLayout";
import AuthorizedLayout from "@/layouts/AuthorizedLayout";
import UnauthorizedLayout from "@/layouts/UnauthorizedLayout";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ExplorePage from "@/pages/ExplorePage";
import CommunityPage from "@/pages/CommunityPage";
import CreateBetPage from "@/pages/CreateBetPage";
import BetDetailPage from "@/pages/BetDetailPage";
import JoinBetPage from "@/pages/JoinBetPage";
import CheckInPage from "@/pages/CheckInPage";
import WalletPage from "@/pages/WalletPage";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import NotFoundPage from "@/pages/NotFoundPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        element: <AuthorizedLayout />,
        children: [
          { path: "", element: <DashboardPage /> },
          { path: "explore", element: <ExplorePage /> },
          { path: "community", element: <CommunityPage /> },
          { path: "bets/create", element: <CreateBetPage /> },
          { path: "bets/:id", element: <BetDetailPage /> },
          { path: "bets/:betId/checkin", element: <CheckInPage /> },
          { path: "bets/:betId/checkins/:dayId", element: <CheckInPage /> },
          { path: "bets/join/:inviteCode", element: <JoinBetPage /> },
          { path: "wallet", element: <WalletPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
      {
        path: "auth",
        element: <UnauthorizedLayout />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default router;
