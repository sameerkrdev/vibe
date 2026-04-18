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
          <h1 className="text-2xl font-bold">
            Hey, {user?.displayName?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Flame className="h-5 w-5 text-orange-400" />} label="Active Bets" value={activeBets.length} />
        <StatCard icon={<Trophy className="h-5 w-5 text-accent" />} label="Tokens" value={user?.tokenBalance ?? 0} accent />
        <StatCard icon={<CheckCircle className="h-5 w-5 text-green-400" />} label="Pending Votes" value={pendingVotes.length} />
        <StatCard icon={<Flame className="h-5 w-5 text-primary" />} label="Draft Bets" value={draftBets.length} />
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
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors"
              >
                <img src={proof.imageUrl} alt="proof" className="h-12 w-12 rounded-md object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{proof.bet.title}</p>
                  <p className="text-xs text-muted-foreground">by {proof.user.displayName}</p>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Vote</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">Active Bets</h2>
        {betsLoading ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : activeBets.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card">
            <p className="text-muted-foreground">No active bets yet.</p>
            <Button asChild variant="ghost" className="mt-2">
              <Link to="/explore">Explore public bets</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
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
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={"text-2xl font-bold" + (accent ? " text-accent" : "")}>{value}</p>
      </CardContent>
    </Card>
  );
}
