import { useAuthStore } from "@/store/auth.store";

export function TokenBalance({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <span className={className}>
      <span className="text-accent font-bold">{user.tokenBalance}</span>
      <span className="text-muted-foreground text-xs ml-1">tokens</span>
    </span>
  );
}
