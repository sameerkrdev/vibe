import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import type { TokenTransaction } from "@/types/api";
import { cn } from "@/lib/utils";

const typeConfig: Record<TokenTransaction["type"], { label: string; positive: boolean }> = {
  SIGNUP_BONUS: { label: "Signup Bonus", positive: true },
  BET_LOCK: { label: "Bet Locked", positive: false },
  BET_REFUND: { label: "Refund", positive: true },
  BET_PAYOUT: { label: "Payout", positive: true },
  BET_DEDUCT: { label: "Deducted", positive: false },
  PAYOUT_CLAIM: { label: "Claimed", positive: true },
};

export default function WalletPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await api.get<{
        success: boolean;
        balance: number;
        transactions: TokenTransaction[];
        pagination: { page: number; total: number; totalPages: number };
      }>("/api/wallet");
      return res.data;
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Wallet</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card className="glass-card border-white/5 bg-background/40 hover:bg-background/50 transition-colors shadow-sm rounded-xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-primary" /> Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-bold tracking-tight text-primary">
              {data?.balance ?? user?.tokenBalance ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">tokens</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5 bg-background/40 hover:bg-background/50 transition-colors shadow-sm rounded-xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-400" /> Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-bold tracking-tight">{data?.pagination.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">all time</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Transaction History</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : !data?.transactions.length ? (
          <p className="text-muted-foreground text-sm text-center py-8">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {data.transactions.map((tx) => {
              const cfg = typeConfig[tx.type];
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-background/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all"
                >
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                    cfg.positive ? "bg-green-500/20" : "bg-red-500/20",
                  )}>
                    {cfg.positive ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn("font-semibold text-sm", cfg.positive ? "text-green-400" : "text-red-400")}>
                      {cfg.positive ? "+" : "-"}{Math.abs(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.balanceAfter} total</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
