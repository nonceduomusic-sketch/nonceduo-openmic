import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuth } from "@/contexts/SocialAuthContext";

export type StaffRole = "owner" | "admin" | "moderator" | "operator";

interface UseStaffRoleResult {
  isLoading: boolean;
  role: StaffRole | null;
  isStaff: boolean;
}

/**
 * Client-side convenience hook to decide whether to SHOW admin entry points.
 * Real protection still happens inside /admin via AdminContext role checks.
 */
export function useStaffRole(): UseStaffRoleResult {
  const { user } = useSocialAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin", "moderator", "operator"])
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // Fail closed: if we can't read roles, we don't show admin entry points.
        console.error("Staff role check failed:", error);
        setRole(null);
        setIsLoading(false);
        return;
      }

      setRole((data?.role as StaffRole | undefined) ?? null);
      setIsLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return {
    isLoading,
    role,
    isStaff: !!role,
  };
}
