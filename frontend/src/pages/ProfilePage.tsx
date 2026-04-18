import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { User } from "@/types/api";

const schema = z.object({
  displayName: z.string().min(2),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: user?.displayName ?? "", avatarUrl: user?.avatarUrl ?? "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.patch<{ success: boolean; user: User }>("/api/users/me", data);
      return res.data.user;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      void qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated!");
      setEditing(false);
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const initials = user?.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Profile</h1>

      <Card className="glass-card border-white/5 bg-background/40 shadow-sm rounded-xl">
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-border shadow-sm">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-lg">{user?.displayName}</h2>
              <p className="text-muted-foreground text-sm">@{user?.username}</p>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4 px-5 pb-5 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-accent">{user?.tokenBalance}</p>
            <p className="text-xs text-muted-foreground">tokens</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">—</p>
            <p className="text-xs text-muted-foreground">longest streak</p>
          </div>
        </CardContent>
      </Card>

      {editing ? (
        <Card className="glass-card border-white/5 bg-background/40 shadow-sm rounded-xl">
          <CardHeader className="pt-5 px-5 pb-2">
            <CardTitle className="text-sm font-semibold">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" {...register("displayName")} />
                {errors.displayName && (
                  <p className="text-xs text-destructive">{errors.displayName.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
                <Input id="avatarUrl" placeholder="https://..." {...register("avatarUrl")} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="rounded-full shadow-sm" onClick={() => setEditing(true)}>
          Edit Profile
        </Button>
      )}
    </div>
  );
}
