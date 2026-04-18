import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Coins, Copy, Play, X, Users } from "lucide-react";
import type { Bet } from "@/types/api";
import { cn } from "@/lib/utils";

const statusColors: Record<Bet["status"], string> = {
  DRAFT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  COMPLETED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function BetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: bet, isLoading } = useQuery({
    queryKey: ["bet", id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; bet: Bet }>(`/api/bets/${id!}`);
      return res.data.bet;
    },
    enabled: !!id,
  });

  const startMutation = useMutation({
    mutationFn: () => api.post<{ success: boolean; bet: Bet }>(`/api/bets/${id!}/start`),
    onSuccess: () => {
      toast.success("Bet started!");
      void qc.invalidateQueries({ queryKey: ["bet", id] });
      void qc.invalidateQueries({ queryKey: ["my-bets"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to start"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.delete(`/api/bets/${id!}`),
    onSuccess: () => {
      toast.success("Bet cancelled, tokens refunded");
      void navigate("/");
    },
    onError: () => toast.error("Failed to cancel"),
  });

  const copyInvite = () => {
    if (!bet) return;
    const link = `${window.location.origin}/bets/join/${bet.inviteCode}`;
    void navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!bet) return <p className="text-muted-foreground">Bet not found.</p>;

  const isCreator = bet.creatorId === user?.id;
  const isParticipant = bet.participants.some((p) => p.userId === user?.id);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{bet.title}</h1>
          {bet.description && (
            <p className="text-muted-foreground text-sm mt-1">{bet.description}</p>
          )}
        </div>
        <Badge className={cn("border flex-shrink-0", statusColors[bet.status])}>
          {bet.status}
        </Badge>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-accent" />
          <span className="text-accent font-medium">{bet.entryTokens}</span> tokens entry
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {format(new Date(bet.startDate), "MMM d")} –{" "}
          {format(new Date(bet.endDate), "MMM d, yyyy")}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {bet._count.participants} participants
        </span>
      </div>

      <Separator />

      {/* Proof requirement */}
      <div>
        <h3 className="font-semibold text-sm mb-1">Proof Requirement</h3>
        <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
          {bet.proofDescription}
        </p>
      </div>

      {/* Check-in days */}
      <div>
        <h3 className="font-semibold text-sm mb-2">Check-in Days</h3>
        <div className="flex flex-wrap gap-1.5">
          {bet.scheduledDays.map((day) => (
            <Badge key={day} variant="outline" className="text-xs">
              {day}
            </Badge>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Participants</h3>
        <div className="space-y-2">
          {bet.participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-card border">
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {p.user.displayName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {p.user.displayName}
                  {p.userId === bet.creatorId && (
                    <span className="ml-1 text-xs text-muted-foreground">(creator)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  🔥 {p.streak} day streak
                </p>
              </div>
              <Badge
                className={cn(
                  "text-xs border",
                  p.status === "ACTIVE"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : p.status === "ELIMINATED"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30",
                )}
              >
                {p.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isParticipant && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {bet.status === "DRAFT" && (
              <>
                <Button size="sm" variant="outline" onClick={copyInvite}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Invite
                </Button>
                {isCreator && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => startMutation.mutate()}
                      disabled={startMutation.isPending || bet._count.participants < 2}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                      {startMutation.isPending ? "Starting…" : "Start Bet"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      {cancelMutation.isPending ? "Cancelling…" : "Cancel"}
                    </Button>
                  </>
                )}
              </>
            )}
            {bet.status === "ACTIVE" && (
              <Button size="sm" asChild>
                <a href={`/bets/${bet.id}/checkin`}>📸 Submit Proof</a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
