import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/types/api";
import { cn } from "@/lib/utils";

const icons: Record<Notification["type"], string> = {
  CHECK_IN_REMINDER: "⏰",
  VOTE_NEEDED: "🗳️",
  PROOF_PASSED: "✅",
  PROOF_FAILED: "❌",
  BET_STARTED: "🚀",
  BET_COMPLETED: "🏁",
  BET_CANCELLED: "🚫",
  PLAYER_ELIMINATED: "💀",
  PAYOUT_AVAILABLE: "💰",
};

export function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
        !notification.isRead && "bg-primary/5 border-l-2 border-l-primary",
      )}
    >
      <div className="flex gap-3 items-start">
        <span className="text-lg mt-0.5">{icons[notification.type]}</span>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", !notification.isRead && "text-foreground")}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{notification.body}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.isRead && (
          <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
        )}
      </div>
    </button>
  );
}
