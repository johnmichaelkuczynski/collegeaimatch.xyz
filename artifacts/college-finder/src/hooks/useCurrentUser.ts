import { useQuery } from "@tanstack/react-query";

export interface CurrentUser {
  id: number;
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.BASE_URL.replace(/\/$/, "")}/../api/auth/me`,
        { credentials: "include" }
      );
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch current user");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
