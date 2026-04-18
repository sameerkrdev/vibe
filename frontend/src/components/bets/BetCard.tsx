import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Coins, Calendar, Zap } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Bet } from "@/types/api";
import { cn } from "@/lib/utils";

const statusColors: Record<Bet["status"], string> = {
  DRAFT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  COMPLETED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const typeIcons: Record<Bet["type"], React.ReactNode> = {
  RECURRING: <Users className="h-3.5 w-3.5" />,
  LAST_MAN_STANDING: <Zap className="h-3.5 w-3.5" />,
};

const typeLabels: Record<Bet["type"], string> = {
  RECURRING: "TrustPod",
  LAST_MAN_STANDING: "Last Man Standing",
};

export function BetCard({ bet, showJoin }: { bet: Bet; showJoin?: boolean }) {
  return (
    <Card className="glass-card bg-background/40 hover:bg-background/50 border-white/5 hover:border-primary/40 transition-all group rounded-xl shadow-sm hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              to={showJoin ? `/bets/join/${bet.inviteCode}` : `/bets/${bet.id}`}
              className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
            >
              {bet.title}
            </Link>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{bet.description}</p>
          </div>
          <Badge className={cn("text-xs border flex-shrink-0", statusColors[bet.status])}>
            {bet.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {typeIcons[bet.type]}
          <span>{typeLabels[bet.type]}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-accent" />
            <span className="text-accent font-medium">{bet.entryTokens}</span> tokens
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {bet._count.participants} joined
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(bet.startDate), "MMM d")}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {bet.participants.slice(0, 4).map((p) => (
              <Avatar key={p.id} className="h-5 w-5 border border-background">
                <AvatarImage src={p.user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                  {p.user.displayName[0]}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            by {bet.creator.displayName} ·{" "}
            {formatDistanceToNow(new Date(bet.createdAt), { addSuffix: true })}
          </span>
        </div>
      </CardContent>

      {showJoin && (
        <CardFooter className="pt-0">
          <Link
            to={`/bets/join/${bet.inviteCode}`}
            className="w-full text-center text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-md py-1.5 transition-colors font-medium"
          >
            View &amp; Join
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
