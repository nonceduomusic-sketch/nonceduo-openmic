import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side permission check via the SECURITY DEFINER DB function `has_permission`.
 * Fail-closed: if anything fails, permissions are treated as false.
 */
export function usePermissionCheck(userId: string | undefined, permissionName: string) {
  return useQuery({
    queryKey: ["permission", userId, permissionName],
    enabled: !!userId && !!permissionName,
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc("has_permission", {
        _user_id: userId,
        _permission_name: permissionName,
      });

      if (error) {
        console.error("Permission check failed:", error);
        return false;
      }

      return !!data;
    },
  });
}
