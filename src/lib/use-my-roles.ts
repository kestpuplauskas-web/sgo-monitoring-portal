import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/admin-roles";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { roles: [] as AppRole[], email: "" };
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (error) throw error;
      return { roles: (data ?? []).map((r) => r.role as AppRole), email: u.user.email ?? "" };
    },
    staleTime: 10 * 60 * 1000,
  });
}
