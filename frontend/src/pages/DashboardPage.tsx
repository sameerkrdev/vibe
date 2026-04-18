import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { BetCard } from "@/components/bets/BetCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Flame, Trophy, CheckCircle } from "lucide-react";
import type { Bet, ProofSubmission } from "@/types/api";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: bets = [], isLoading: betsLoading } = useQuery({
    queryKey: ["my-bets"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; bets: Bet[] }>("/api/bets/my");
      return res.data.bets;
    },
  });

  const activeBets = bets.filter((b) => b.status === "ACTIVE");
  const draftBets = bets.filter((b) => b.status === "DRAFT");

  const { data: pendingVotes = [] } = useQuery({
    queryKey: ["pending-votes", activeBets[0]?.id],
    queryFn: async () => {
      if (!activeBets[0]) return [];
      const res = await api.get<{ success: boolean; proofs: ProofSubmission[] }>(
        `/api/bets/${activeBets[0].id}/checkins/pending-votes`,
      );
      return res.data.proofs;
    },
    enabled: activeBets.length > 0,
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Hey, {user?.displayName?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Keep your streak alive — one day at a time.
          </p>
        </div>
        <Button asChild>
          <Link to="/bets/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Bet
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Flame className="h-5 w-5 text-orange-400" />} label="Active Bets" value={activeBets.length} />
        <StatCard icon={<Trophy className="h-5 w-5 text-primary" />} label="Tokens" value={user?.tokenBalance ?? 0} accent />
        <StatCard icon={<CheckCircle className="h-5 w-5 text-green-400" />} label="Pending Votes" value={pendingVotes.length} />
        <StatCard icon={<Flame className="h-5 w-5 text-muted-foreground" />} label="Draft Bets" value={draftBets.length} />
      </div>

      {pendingVotes.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            Votes Needed
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{pendingVotes.length}</Badge>
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {pendingVotes.slice(0, 4).map((proof) => (
              <Link
                key={proof.id}
                to={`/bets/${proof.betId}/checkins/${proof.checkInDayId}`}
                className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-background/40 backdrop-blur-md shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
              >
                <img src={proof.imageUrl} alt="proof" className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{proof.bet.title}</p>
                  <p className="text-xs text-muted-foreground">by {proof.user.displayName}</p>
                </div>
                <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs py-1 px-3">Vote</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">Active Bets</h2>
        {betsLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : activeBets.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card/30 backdrop-blur-sm border-white/5">
            <p className="text-muted-foreground">No active bets yet.</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/explore">Explore public bets</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activeBets.map((bet) => <BetCard key={bet.id} bet={bet} />)}
          </div>
        )}
      </div>

      {draftBets.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 text-muted-foreground">Draft Bets</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {draftBets.map((bet) => <BetCard key={bet.id} bet={bet} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <Card className="glass-card border-white/5 bg-background/40 hover:bg-background/50 transition-colors shadow-sm rounded-xl">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center gap-2.5">
          {icon}
          <CardTitle className="text-sm text-muted-foreground font-medium">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <p className={"text-3xl font-bold tracking-tight" + (accent ? " text-primary" : " text-foreground")}>{value}</p>
      </CardContent>
    </Card>
  );
}
