import { useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissionCheck } from "@/hooks/usePermissionCheck";

export type AdminSectionKey = "openmic" | "dediche" | "community";

type AccessMap = Record<AdminSectionKey, boolean>;

/**
 * Computes which main admin sections are visible/usable for the current staff user.
 * - Owner: always allowed
 * - Others: based on granular permissions
 */
export function useAdminSectionAccess() {
  const { session, staffRole } = useAdmin();
  const rawUserId = session?.user?.id;

  const isOwner = staffRole === "owner";

  // Avoid unnecessary RPC calls for the Owner.
  const userId = isOwner ? undefined : rawUserId;

  const openmic = usePermissionCheck(userId, "openmic.view");
  const dediche = usePermissionCheck(userId, "dediche.view");
  const community = usePermissionCheck(userId, "community.view");

  const isLoading = !isOwner && (openmic.isLoading || dediche.isLoading || community.isLoading);

  const access: AccessMap = useMemo(
    () => ({
      openmic: isOwner ? true : !!openmic.data,
      dediche: isOwner ? true : !!dediche.data,
      community: isOwner ? true : !!community.data,
    }),
    [isOwner, openmic.data, dediche.data, community.data],
  );

  return {
    isLoading,
    access,
  };
}
