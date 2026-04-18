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
  emailOrUsername: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post<{ success: boolean; user: User }>("/api/auth/login", data);
      return res.data.user;
    },
    onSuccess: (user) => {
      setUser(user);
      void navigate("/");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Login failed";
      toast.error(msg);
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="emailOrUsername">Email or username</Label>
        <Input
          id="emailOrUsername"
          placeholder="you@example.com"
          {...register("emailOrUsername")}
        />
        {errors.emailOrUsername && (
          <p className="text-sm text-destructive">{errors.emailOrUsername.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
