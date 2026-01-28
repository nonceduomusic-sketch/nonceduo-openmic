import { useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissionCheck } from "@/hooks/usePermissionCheck";

export type AdminSectionKey = "openmic" | "dediche" | "community";

type AccessMap = Record<AdminSectionKey, boolean>;

/**
 * Computes which main admin sections are visible/usable for the current staff user.
 * - Owner: always allowed
 * - Operators: handled separately by useOperatorPermissions
 * - Others: based on granular permissions
 */
export function useAdminSectionAccess() {
  const { session, staffRole } = useAdmin();
  const rawUserId = session?.user?.id;

  const isOwner = staffRole === "owner";
  const isOperator = staffRole === "operator";

  // Operators are handled by useOperatorPermissions, so skip checks here
  // Avoid unnecessary RPC calls for the Owner or Operator.
  const userId = (isOwner || isOperator) ? undefined : rawUserId;

  const openmic = usePermissionCheck(userId, "openmic.view");
  const dediche = usePermissionCheck(userId, "dediche.view");
  const community = usePermissionCheck(userId, "community.view");

  const isLoading = !isOwner && !isOperator && (openmic.isLoading || dediche.isLoading || community.isLoading);

  const access: AccessMap = useMemo(
    () => ({
      // For operators, these will return true but actual access is controlled by useOperatorPermissions
      openmic: isOwner ? true : isOperator ? true : !!openmic.data,
      dediche: isOwner ? true : isOperator ? true : !!dediche.data,
      community: isOwner ? true : isOperator ? false : !!community.data,
    }),
    [isOwner, isOperator, openmic.data, dediche.data, community.data],
  );

  return {
    isLoading,
    access,
  };
}
