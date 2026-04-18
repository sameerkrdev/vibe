import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { BetCard } from "@/components/bets/BetCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass } from "lucide-react";
import type { Bet } from "@/types/api";

export default function ExplorePage() {
  const { data: bets = [], isLoading } = useQuery({
    queryKey: ["explore"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; bets: Bet[] }>("/api/bets/explore");
      return res.data.bets;
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Compass className="h-8 w-8 text-primary" /> Explore
        </h1>
        <p className="text-muted-foreground mt-1">
          Join public bets and compete with others globally.
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : bets.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card/30 backdrop-blur-sm border-white/5">
          <Compass className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No public bets available right now.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bets.map((bet) => <BetCard key={bet.id} bet={bet} showJoin />)}
        </div>
      )}
    </div>
  );
}
