import { useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissionCheck } from "@/hooks/usePermissionCheck";

/**
 * Hook that provides granular community permission checks.
 * Returns booleans for each action type.
 * Owner always has full access.
 */
export function useCommunityPermissions() {
  const { session, staffRole } = useAdmin();
  const userId = session?.user?.id;
  const isOwner = staffRole === "owner";

  // Skip RPC calls if owner (they have all permissions)
  const checkUserId = isOwner ? undefined : userId;

  // Granular permission checks
  const canView = usePermissionCheck(checkUserId, "community.view");
  const canManageGroups = usePermissionCheck(checkUserId, "community.manage_groups");
  const canManageUsers = usePermissionCheck(checkUserId, "community.manage_users");
  const canModerate = usePermissionCheck(checkUserId, "community.moderate");
  const canDelete = usePermissionCheck(checkUserId, "community.delete");
  const canReset = usePermissionCheck(checkUserId, "community.reset");
  const canApproveJoin = usePermissionCheck(checkUserId, "community.approve_join");

  const isLoading =
    !isOwner &&
    (canView.isLoading ||
      canManageGroups.isLoading ||
      canManageUsers.isLoading ||
      canModerate.isLoading ||
      canDelete.isLoading ||
      canReset.isLoading ||
      canApproveJoin.isLoading);

  const permissions = useMemo(
    () => ({
      // Basic view access
      canView: isOwner || !!canView.data,
      // Group management (create, edit, delete groups)
      canManageGroups: isOwner || !!canManageGroups.data,
      // User management (block, unblock, promote)
      canManageUsers: isOwner || !!canManageUsers.data,
      // Content moderation (edit/delete posts and comments)
      canModerate: isOwner || !!canModerate.data,
      // Delete content
      canDelete: isOwner || !!canDelete.data,
      // Full reset
      canReset: isOwner || !!canReset.data,
      // Approve join requests
      canApproveJoin: isOwner || !!canApproveJoin.data,
      // Convenience: can do any write operation on groups
      canEditGroups: isOwner || !!canManageGroups.data,
      // Convenience: can delete groups (requires manage_groups OR delete)
      canDeleteGroups: isOwner || !!canManageGroups.data || !!canDelete.data,
      // Convenience: can delete posts (requires moderate OR delete)
      canDeletePosts: isOwner || !!canModerate.data || !!canDelete.data,
      // Convenience: can edit posts (requires moderate)
      canEditPosts: isOwner || !!canModerate.data,
    }),
    [
      isOwner,
      canView.data,
      canManageGroups.data,
      canManageUsers.data,
      canModerate.data,
      canDelete.data,
      canReset.data,
      canApproveJoin.data,
    ]
  );

  return {
    isLoading,
    isOwner,
    ...permissions,
  };
}

export type CommunityPermissions = ReturnType<typeof useCommunityPermissions>;
