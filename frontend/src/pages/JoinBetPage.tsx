import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { Coins, Users, Calendar } from "lucide-react";
import type { Bet } from "@/types/api";

export default function JoinBetPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();

  const { data: bet, isLoading } = useQuery({
    queryKey: ["bet-preview", inviteCode],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; bet: Bet }>(
        `/api/bets/join/${inviteCode!}`,
      );
      return res.data.bet;
    },
    enabled: !!inviteCode,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ success: boolean; bet: Bet }>(
        `/api/bets/join/${inviteCode!}`,
      );
      return res.data.bet;
    },
    onSuccess: (b) => {
      toast.success("Joined bet!");
      void navigate(`/bets/${b.id}`);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!bet) return <p className="text-muted-foreground">Invalid invite link.</p>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">You've been invited!</h1>
        <p className="text-muted-foreground text-sm mt-1">Review the bet before joining.</p>
      </div>

      <Card className="glass-card border-white/5 bg-background/40 shadow-sm rounded-xl">
        <CardHeader className="pt-5 px-5 pb-3">
          <CardTitle>{bet.title}</CardTitle>
          {bet.description && (
            <p className="text-sm text-muted-foreground">{bet.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Coins className="h-4 w-4 text-accent" />
              <span className="text-accent font-medium">{bet.entryTokens}</span> tokens
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(bet.startDate), "MMM d")} –{" "}
              {format(new Date(bet.endDate), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              {bet._count.participants} joined
            </span>
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Proof required:</p>
            <p className="text-sm bg-muted rounded-md px-3 py-2">{bet.proofDescription}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Check-in days:</p>
            <div className="flex flex-wrap gap-1">
              {bet.scheduledDays.map((d) => (
                <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Participants:</p>
            <div className="flex -space-x-2">
              {bet.participants.slice(0, 6).map((p) => (
                <Avatar key={p.id} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={p.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                    {p.user.displayName[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>

          <Button
            className="w-full rounded-xl py-6 text-base font-semibold shadow-sm"
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? "Joining…" : `Join — stake ${bet.entryTokens} tokens`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
