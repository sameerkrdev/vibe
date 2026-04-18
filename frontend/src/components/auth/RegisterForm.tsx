import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { User } from "@/types/api";

const schema = z.object({
  email: z.string().email("Invalid email"),
  username: z.string().min(3, "At least 3 characters").max(20).regex(/^\w+$/, "Alphanumeric + underscore only"),
  displayName: z.string().min(2, "At least 2 characters"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post<{ success: boolean; user: User }>("/api/auth/register", data);
      return res.data.user;
    },
    onSuccess: (user) => {
      setUser(user);
      toast.success("Welcome to StakeStreak! You've received 500 tokens.");
      void navigate("/");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg);
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" placeholder="Your Name" {...register("displayName")} />
        {errors.displayName && (
          <p className="text-sm text-destructive">{errors.displayName.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="username">Username</Label>
        <Input id="username" placeholder="username" {...register("username")} />
        {errors.username && (
          <p className="text-sm text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Min. 8 characters" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
