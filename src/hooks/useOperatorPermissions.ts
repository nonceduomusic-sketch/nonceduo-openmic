import { useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissionCheck } from "@/hooks/usePermissionCheck";

/**
 * Hook for checking operator-specific permissions.
 * Operators have a restricted view of the admin dashboard.
 */
export function useOperatorPermissions() {
  const { session, staffRole } = useAdmin();
  const userId = session?.user?.id;
  const isOperator = staffRole === "operator";

  // Skip RPC calls if not an operator (owners/admins/moderators have full access)
  const checkUserId = isOperator ? userId : undefined;

  // Section visibility permissions
  const canViewCentro = usePermissionCheck(checkUserId, "operator.view_centro");
  const canViewOpenmic = usePermissionCheck(checkUserId, "operator.view_openmic");
  const canViewDediche = usePermissionCheck(checkUserId, "operator.view_dediche");

  // Action level permissions
  const openmicReadonly = usePermissionCheck(checkUserId, "operator.openmic_readonly");
  const openmicManage = usePermissionCheck(checkUserId, "operator.openmic_manage");
  const dedicheReadonly = usePermissionCheck(checkUserId, "operator.dediche_readonly");
  const dedicheManage = usePermissionCheck(checkUserId, "operator.dediche_manage");

  // Assistente permissions (3 levels)
  const assistenteView = usePermissionCheck(checkUserId, "operator.assistente_view");
  const assistenteManage = usePermissionCheck(checkUserId, "operator.assistente_manage");
  const assistenteFull = usePermissionCheck(checkUserId, "operator.assistente_full");

  // Trasmetti permissions (3 levels)
  const trasmettiView = usePermissionCheck(checkUserId, "operator.trasmetti_view");
  const trasmettiManage = usePermissionCheck(checkUserId, "operator.trasmetti_manage");
  const trasmettiFull = usePermissionCheck(checkUserId, "operator.trasmetti_full");

  const isLoading =
    isOperator &&
    (canViewCentro.isLoading ||
      canViewOpenmic.isLoading ||
      canViewDediche.isLoading ||
      openmicReadonly.isLoading ||
      openmicManage.isLoading ||
      dedicheReadonly.isLoading ||
      dedicheManage.isLoading ||
      assistenteView.isLoading ||
      assistenteManage.isLoading ||
      assistenteFull.isLoading ||
      trasmettiView.isLoading ||
      trasmettiManage.isLoading ||
      trasmettiFull.isLoading);

  const permissions = useMemo(() => {
    // Non-operators don't use this hook's permissions (they have full access)
    if (!isOperator) {
      return {
        isOperator: false,
        // Sections - all visible for non-operators
        canViewCentro: true,
        canViewOpenmic: true,
        canViewDediche: true,
        canViewAssistente: true,
        canViewTrasmetti: true,
        // Actions - all allowed for non-operators
        canManageOpenmic: true,
        canManageDediche: true,
        canManageAssistente: true,
        canDeleteAssistente: true,
        canManageTrasmetti: true,
        canFullTrasmetti: true,
        // Destructive actions - allowed for non-operators (controlled elsewhere)
        canReset: true,
        canDelete: true,
      };
    }

    // Operator permissions
    return {
      isOperator: true,
      // Sections
      canViewCentro: !!canViewCentro.data,
      canViewOpenmic: !!canViewOpenmic.data,
      canViewDediche: !!canViewDediche.data,
      canViewAssistente: !!assistenteView.data || !!assistenteManage.data || !!assistenteFull.data,
      canViewTrasmetti: !!trasmettiView.data || !!trasmettiManage.data || !!trasmettiFull.data,
      // Actions
      canManageOpenmic: !!openmicManage.data,
      canManageDediche: !!dedicheManage.data,
      canManageAssistente: !!assistenteManage.data || !!assistenteFull.data,
      canDeleteAssistente: !!assistenteFull.data,
      canManageTrasmetti: !!trasmettiManage.data || !!trasmettiFull.data,
      canFullTrasmetti: !!trasmettiFull.data,
      // OPERATORS NEVER have destructive actions
      canReset: false,
      canDelete: false,
    };
  }, [
    isOperator,
    canViewCentro.data,
    canViewOpenmic.data,
    canViewDediche.data,
    openmicManage.data,
    dedicheManage.data,
    assistenteView.data,
    assistenteManage.data,
    assistenteFull.data,
    trasmettiView.data,
    trasmettiManage.data,
    trasmettiFull.data,
  ]);

  return {
    isLoading,
    ...permissions,
  };
}

export type OperatorPermissions = ReturnType<typeof useOperatorPermissions>;
