import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CentroPermissions {
  monitorFormats: boolean;
  activeFormats: boolean;
  serataLive: boolean;
}

export const useCentroPermissions = () => {
  const [permissions, setPermissions] = useState<CentroPermissions>({
    monitorFormats: false,
    activeFormats: false,
    serataLive: false,
  });
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Check if user is owner (owners have all permissions)
        const { data: ownerData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .maybeSingle();

        const userIsOwner = !!ownerData;
        setIsOwner(userIsOwner);

        if (userIsOwner) {
          // Owner has all permissions
          setPermissions({
            monitorFormats: true,
            activeFormats: true,
            serataLive: true,
          });
        } else {
          // Check individual permissions
          const permissionNames = [
            'centro.monitor_formats',
            'centro.active_formats',
            'centro.serata_live',
          ];

          const { data: userPerms } = await supabase
            .from('user_permissions')
            .select(`
              granted,
              permissions!inner(name)
            `)
            .eq('user_id', user.id)
            .in('permissions.name', permissionNames);

          const { data: rolePerms } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          // Build permissions map
          const grantedPerms = new Set<string>();
          const deniedPerms = new Set<string>();

          userPerms?.forEach((up: any) => {
            const permName = up.permissions?.name;
            if (permName) {
              if (up.granted) {
                grantedPerms.add(permName);
              } else {
                deniedPerms.add(permName);
              }
            }
          });

          // Check role-based permissions if user has admin/moderator role
          if (rolePerms?.some((r: any) => r.role === 'admin' || r.role === 'moderator')) {
            const { data: rolePermData } = await supabase
              .from('role_permissions')
              .select(`
                permissions!inner(name)
              `)
              .in('role', rolePerms?.map((r: any) => r.role) || []);

            rolePermData?.forEach((rp: any) => {
              const permName = rp.permissions?.name;
              if (permName && !deniedPerms.has(permName)) {
                grantedPerms.add(permName);
              }
            });
          }

          setPermissions({
            monitorFormats: grantedPerms.has('centro.monitor_formats'),
            activeFormats: grantedPerms.has('centro.active_formats'),
            serataLive: grantedPerms.has('centro.serata_live'),
          });
        }
      } catch (error) {
        console.error('Error checking centro permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();

    // Subscribe to permission changes
    const channel = supabase
      .channel('centro-permissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_permissions' },
        () => checkPermissions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => checkPermissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hasAnyPermission = permissions.monitorFormats || permissions.activeFormats || permissions.serataLive;

  return {
    permissions,
    isOwner,
    loading,
    hasAnyPermission,
  };
};
