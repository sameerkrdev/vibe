import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types/api";

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; user: User }>("/api/users/me");
      return res.data.user;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!queryLoading) {
      setUser(data ?? null);
    } else {
      setLoading(true);
    }
  }, [data, queryLoading, setUser, setLoading]);

  return { user, isLoading: queryLoading };
}
