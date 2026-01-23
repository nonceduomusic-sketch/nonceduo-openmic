import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { adminAuditLog } from '@/lib/adminAudit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Crown, 
  Shield, 
  ShieldCheck, 
  User, 
  RefreshCw, 
  Search,
  Mic,
  Heart,
  Users,
  Zap,
  Check,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Types
interface Permission {
  id: string;
  name: string;
  description: string;
}

interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface ProfileData {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  granted_by: string | null;
}

type AppRole = 'owner' | 'admin' | 'moderator' | 'user';

// Staff presets for quick assignment
const STAFF_PRESETS = [
  { 
    key: 'staff_openmic', 
    label: 'Staff Open Mic', 
    icon: Mic,
    color: 'bg-accent/20 text-accent-foreground border-accent/30',
    permissions: ['openmic.view', 'openmic.manage']
  },
  { 
    key: 'staff_dediche', 
    label: 'Staff Dediche', 
    icon: Heart,
    color: 'bg-secondary/20 text-secondary-foreground border-secondary/30',
    permissions: ['dediche.view', 'dediche.moderate', 'dediche.manage']
  },
  { 
    key: 'staff_community', 
    label: 'Staff Community', 
    icon: Users,
    color: 'bg-primary/20 text-primary-foreground border-primary/30',
    permissions: ['community.view', 'community.moderate', 'community.manage_groups']
  },
] as const;

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="w-4 h-4 text-accent" />,
  admin: <Shield className="w-4 h-4 text-primary" />,
  moderator: <ShieldCheck className="w-4 h-4 text-secondary" />,
  user: <User className="w-4 h-4 text-muted-foreground" />,
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Staff',
  user: 'Utente',
};

const PERMISSION_GROUP_LABELS: Record<string, string> = {
  openmic: 'Open Mic',
  dediche: 'Dediche',
  community: 'Community',
  settings: 'Impostazioni',
  users: 'Utenti',
  altro: 'Altro',
};

const PRIMARY_PERMISSION_GROUPS = ['openmic', 'dediche', 'community'] as const;

const ROLE_COLORS: Record<AppRole, string> = {
  owner: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  moderator: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  user: 'bg-gray-50 text-gray-600 border-gray-200',
};

export const AdminPermissionsTab: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissionOverride[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [permSearch, setPermSearch] = useState('');
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(UserRole & { profile?: ProfileData }) | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('moderator');
  const [groupEnableDialog, setGroupEnableDialog] = useState<{
    open: boolean;
    role: AppRole;
    groupKey: string;
  } | null>(null);
  const [presetApplyDialog, setPresetApplyDialog] = useState<{
    open: boolean;
    user: UserRole & { profile?: ProfileData };
    preset: typeof STAFF_PRESETS[number];
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [permsRes, rolePermsRes, userRolesRes, userPermsRes, profilesRes] = await Promise.all([
        supabase.from('permissions').select('*').order('name'),
        supabase.from('role_permissions').select('*'),
        supabase.from('user_roles').select('*').order('role', { ascending: true }),
        supabase.from('user_permissions').select('*'),
        supabase.from('profiles').select('user_id, display_name, username, avatar_url'),
      ]);

      if (permsRes.error) throw permsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;
      if (userRolesRes.error) throw userRolesRes.error;
      if (userPermsRes.error) throw userPermsRes.error;
      
      setPermissions(permsRes.data || []);
      setRolePermissions(rolePermsRes.data || []);
      setUserRoles(userRolesRes.data || []);
      setUserPermissions(userPermsRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Error fetching permissions data:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i dati dei permessi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('permissions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_permissions' },
        () => {
          console.log('[Realtime] user_permissions changed');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => {
          console.log('[Realtime] user_roles changed');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        () => {
          console.log('[Realtime] role_permissions changed');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Profile lookup helper
  const getProfile = useCallback((userId: string) => {
    return profiles.find(p => p.user_id === userId);
  }, [profiles]);

  const getRolePermissions = (role: string): string[] => {
    return rolePermissions
      .filter(rp => rp.role === role)
      .map(rp => rp.permission_id);
  };

  const hasRolePermission = (role: string, permissionId: string): boolean => {
    return rolePermissions.some(rp => rp.role === role && rp.permission_id === permissionId);
  };

  const getPermissionGroupKey = (permissionName: string) => {
    const raw = permissionName.split('.')[0] || 'altro';
    return raw.trim() || 'altro';
  };

  // Check if user has a specific permission via user_permissions override
  const hasUserPermissionOverride = useCallback((userId: string, permissionName: string): boolean | null => {
    const perm = permissions.find(p => p.name === permissionName);
    if (!perm) return null;
    
    const override = userPermissions.find(up => up.user_id === userId && up.permission_id === perm.id);
    return override ? override.granted : null;
  }, [permissions, userPermissions]);

  // Apply staff preset to a user
  const applyStaffPreset = async (user: UserRole, preset: typeof STAFF_PRESETS[number]) => {
    try {
      // First, ensure user is at least moderator role
      if (user.role === 'user') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'moderator' })
          .eq('id', user.id);
        
        if (roleError) throw roleError;
      }

      // Get permission IDs for the preset
      const permIds = preset.permissions.map(pName => {
        const p = permissions.find(perm => perm.name === pName);
        return p?.id;
      }).filter(Boolean) as string[];

      // Insert user permission overrides
      const rows = permIds.map(permission_id => ({
        user_id: user.user_id,
        permission_id,
        granted: true,
      }));

      // Upsert - delete existing then insert
      for (const permission_id of permIds) {
        await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', user.user_id)
          .eq('permission_id', permission_id);
      }

      if (rows.length > 0) {
        const { error } = await supabase.from('user_permissions').insert(rows);
        if (error) throw error;
      }

      const profile = getProfile(user.user_id);
      toast({
        title: 'Preset applicato',
        description: `${preset.label} assegnato a ${profile?.display_name || 'utente'}`,
      });

      adminAuditLog({
        action: 'permissions.apply_preset',
        section: 'settings',
        entity: 'user_permissions',
        entity_id: user.user_id,
        metadata: { preset: preset.key, permissions: preset.permissions },
      });

      fetchData();
    } catch (error) {
      console.error('Error applying preset:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile applicare il preset',
        variant: 'destructive',
      });
    }
  };

  const toggleRolePermissionGroup = async (role: AppRole, groupKey: string, enable: boolean) => {
    try {
      const groupPermissionIds = permissions
        .filter((p) => getPermissionGroupKey(p.name) === groupKey)
        .map((p) => p.id);

      if (groupPermissionIds.length === 0) return;

      if (!enable) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role)
          .in('permission_id', groupPermissionIds);

        if (error) throw error;
      } else {
        const existing = new Set(
          rolePermissions.filter((rp) => rp.role === role).map((rp) => rp.permission_id)
        );

        const rows = groupPermissionIds
          .filter((id) => !existing.has(id))
          .map((permission_id) => ({ role, permission_id }));

        if (rows.length > 0) {
          const { error } = await supabase.from('role_permissions').insert(rows);
          if (error) throw error;
        }
      }

      toast({
        title: 'Sezione aggiornata',
        description: `${PERMISSION_GROUP_LABELS[groupKey] ?? groupKey}: ${enable ? 'abilitata' : 'disabilitata'} per ${ROLE_LABELS[role]}`,
      });

      adminAuditLog({
        action: 'permissions.role_group_toggle',
        section: 'settings',
        entity: 'role_permissions',
        metadata: { role, group: groupKey, enabled: enable },
      });

      fetchData();
    } catch (error) {
      console.error('Error toggling role permission group:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare la sezione di permessi',
        variant: 'destructive',
      });
    }
  };

  const toggleRolePermissionGroupRecommended = async (role: AppRole, groupKey: string) => {
    try {
      if (role === 'admin' || role === 'owner') {
        await toggleRolePermissionGroup(role, groupKey, true);
        return;
      }

      const inGroup = permissions.filter((p) => getPermissionGroupKey(p.name) === groupKey);
      const recommended = inGroup.filter((p) => {
        const name = p.name.toLowerCase();
        return (
          name.endsWith('.view') ||
          name.endsWith('.read') ||
          name.endsWith('.list') ||
          name.includes('.view_') ||
          name.includes('.read_') ||
          name.includes('.list_')
        );
      });

      const recommendedIds = recommended.map((p) => p.id);
      if (recommendedIds.length === 0) {
        const baseView = inGroup.find((p) => p.name.toLowerCase() === `${groupKey}.view`);
        if (baseView) recommendedIds.push(baseView.id);
      }

      if (recommendedIds.length === 0) {
        toast({
          title: 'Nessun permesso consigliato',
          description: 'Non trovo permessi "view/read/list" per questa sezione.',
          variant: 'destructive',
        });
        return;
      }

      const existing = new Set(
        rolePermissions.filter((rp) => rp.role === role).map((rp) => rp.permission_id)
      );
      const rows = recommendedIds
        .filter((id) => !existing.has(id))
        .map((permission_id) => ({ role, permission_id }));

      if (rows.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(rows);
        if (error) throw error;
      }

      toast({
        title: 'Sezione aggiornata',
        description: `${PERMISSION_GROUP_LABELS[groupKey] ?? groupKey}: abilitazione consigliata per ${ROLE_LABELS[role]}`,
      });

      adminAuditLog({
        action: 'permissions.role_group_enable_recommended',
        section: 'settings',
        entity: 'role_permissions',
        metadata: { role, group: groupKey, mode: 'recommended' },
      });

      fetchData();
    } catch (error) {
      console.error('Error enabling recommended group permissions:', error);
      toast({
        title: 'Errore',
        description: "Impossibile applicare l'abilitazione consigliata",
        variant: 'destructive',
      });
    }
  };

  const toggleRolePermission = async (role: AppRole, permissionId: string, hasPermission: boolean) => {
    try {
      if (hasPermission) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role)
          .eq('permission_id', permissionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role: role as AppRole, permission_id: permissionId });
        if (error) throw error;
      }

      toast({
        title: 'Permesso aggiornato',
        description: `Permesso ${hasPermission ? 'rimosso da' : 'aggiunto a'} ${ROLE_LABELS[role]}`,
      });

      const perm = permissions.find((p) => p.id === permissionId);
      adminAuditLog({
        action: 'permissions.role_toggle',
        section: 'settings',
        entity: 'role_permissions',
        metadata: { role, permission: perm?.name ?? permissionId, enabled: !hasPermission },
      });

      fetchData();
    } catch (error) {
      console.error('Error toggling role permission:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il permesso',
        variant: 'destructive',
      });
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as AppRole })
        .eq('id', selectedUser.id);

      if (error) throw error;

      const profile = selectedUser.profile;
      toast({
        title: 'Ruolo aggiornato',
        description: `${profile?.display_name || 'Utente'} è ora ${ROLE_LABELS[newRole]}`,
      });

      adminAuditLog({
        action: 'users.role_change',
        section: 'settings',
        entity: 'user_roles',
        entity_id: selectedUser.user_id,
        metadata: { from: selectedUser.role, to: newRole, display_name: profile?.display_name },
      });

      setShowRoleChangeDialog(false);
      setSelectedUser(null);
      setNewRole('moderator');
      fetchData();
    } catch (error) {
      console.error('Error changing role:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile cambiare il ruolo',
        variant: 'destructive',
      });
    }
  };

  // Merge user roles with profiles
  const usersWithProfiles = useMemo(() => {
    return userRoles.map(ur => ({
      ...ur,
      profile: getProfile(ur.user_id),
    }));
  }, [userRoles, getProfile]);

  const filteredUsers = usersWithProfiles.filter(ur => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const profile = ur.profile;
    return (
      ur.user_id.toLowerCase().includes(q) ||
      profile?.display_name?.toLowerCase().includes(q) ||
      profile?.username?.toLowerCase().includes(q)
    );
  });

  const groupedUsers = {
    owner: filteredUsers.filter(u => u.role === 'owner'),
    admin: filteredUsers.filter(u => u.role === 'admin'),
    moderator: filteredUsers.filter(u => u.role === 'moderator'),
    user: filteredUsers.filter(u => u.role === 'user'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header - Apple style minimal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Permessi</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestisci ruoli e accessi dello staff
          </p>
        </div>
        <Button 
          onClick={fetchData} 
          variant="outline" 
          size="sm"
          className="self-start md:self-auto rounded-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-full w-full md:w-auto">
          <TabsTrigger value="users" className="rounded-full gap-2 flex-1 md:flex-none">
            <User className="w-4 h-4" />
            <span>Utenti</span>
            <Badge variant="secondary" className="ml-1 rounded-full text-xs">
              {userRoles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-full gap-2 flex-1 md:flex-none">
            <Settings className="w-4 h-4" />
            <span>Ruoli</span>
          </TabsTrigger>
        </TabsList>

        {/* ========== USERS TAB ========== */}
        <TabsContent value="users" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>

          {/* Staff Presets - Quick Actions */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Preset rapidi Staff
              </CardTitle>
              <CardDescription className="text-xs">
                Clicca su un utente e applica un preset per assegnare permessi in blocco
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {STAFF_PRESETS.map(preset => (
                  <Badge
                    key={preset.key}
                    variant="outline"
                    className={cn("cursor-default", preset.color)}
                  >
                    <preset.icon className="w-3 h-3 mr-1" />
                    {preset.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <div className="grid gap-4">
            {(['owner', 'admin', 'moderator', 'user'] as const).map(role => (
              groupedUsers[role].length > 0 && (
                <Card key={role} className="overflow-hidden">
                  <CardHeader className="py-3 bg-muted/30">
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                      {ROLE_ICONS[role]}
                      {ROLE_LABELS[role]}
                      <Badge variant="secondary" className="rounded-full ml-auto">
                        {groupedUsers[role].length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {groupedUsers[role].map(user => {
                        const profile = user.profile;
                        return (
                          <div 
                            key={user.id}
                            className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                          >
                            {/* User Info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {(profile?.display_name || 'U')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {profile?.display_name || 'Utente senza nome'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  @{profile?.username || user.user_id.slice(0, 8)}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Preset buttons for non-owner users */}
                              {role !== 'owner' && !isMobile && (
                                <div className="flex gap-1">
                                  {STAFF_PRESETS.map(preset => (
                                    <Button
                                      key={preset.key}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      title={`Applica ${preset.label}`}
                                      onClick={() => setPresetApplyDialog({ open: true, user, preset })}
                                    >
                                      <preset.icon className="w-4 h-4" />
                                    </Button>
                                  ))}
                                </div>
                              )}

                              {/* Role change */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewRole(user.role as AppRole);
                                  setShowRoleChangeDialog(true);
                                }}
                                disabled={role === 'owner'}
                              >
                                {isMobile ? 'Ruolo' : 'Cambia ruolo'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nessun utente trovato</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== ROLES TAB ========== */}
        <TabsContent value="roles" className="space-y-4">
          {/* Role Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['owner', 'admin', 'moderator', 'user'] as const).map(role => {
              const count = getRolePermissions(role).length;
              return (
                <Card 
                  key={role}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedRole === role 
                      ? 'ring-2 ring-primary shadow-md' 
                      : 'hover:ring-1 hover:ring-primary/30'
                  )}
                  onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                      {ROLE_ICONS[role]}
                      <CardTitle className="text-sm font-medium">
                        {ROLE_LABELS[role]}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      {count} permessi
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {/* Permissions Panel */}
          {selectedRole && (
            <Card className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  {ROLE_ICONS[selectedRole]}
                  Permessi per {ROLE_LABELS[selectedRole]}
                </CardTitle>
                <CardDescription>
                  {selectedRole === 'owner' 
                    ? 'L\'owner ha accesso completo a tutto - i permessi non possono essere modificati'
                    : 'Attiva o disattiva i permessi per questo ruolo'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      placeholder="Cerca permessi..."
                      className="pl-10 rounded-full bg-muted/50 border-0"
                    />
                  </div>

                  {/* Permission Groups */}
                  {(() => {
                    const q = permSearch.trim().toLowerCase();
                    const filtered = !q
                      ? permissions
                      : permissions.filter((p) => {
                          const hay = `${p.name} ${p.description ?? ''}`.toLowerCase();
                          return hay.includes(q);
                        });

                    const groups = filtered.reduce<Record<string, Permission[]>>((acc, p) => {
                      const g = getPermissionGroupKey(p.name);
                      (acc[g] ||= []).push(p);
                      return acc;
                    }, {});

                    const groupKeysInOrder = [
                      ...PRIMARY_PERMISSION_GROUPS,
                      ...Object.keys(groups)
                        .filter((k) => !PRIMARY_PERMISSION_GROUPS.includes(k as any))
                        .sort((a, b) => a.localeCompare(b)),
                    ];

                    const renderPermissionRow = (permission: Permission) => {
                      const hasPerm = hasRolePermission(selectedRole, permission.id);
                      const isOwnerOnly = permission.name === 'manage_owners';
                      const isDisabled =
                        selectedRole === 'owner' ||
                        (isOwnerOnly && selectedRole !== 'admin');

                      const prettyName = permission.name.includes('.')
                        ? permission.name.split('.').pop()
                        : permission.name;

                      return (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between gap-4 py-3 px-1"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <Label className="font-medium text-sm capitalize">
                              {prettyName?.replace(/_/g, ' ')}
                            </Label>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {permission.description}
                            </p>
                          </div>
                          <Switch
                            checked={hasPerm}
                            onCheckedChange={() =>
                              toggleRolePermission(selectedRole, permission.id, hasPerm)
                            }
                            disabled={isDisabled}
                            className="shrink-0"
                          />
                        </div>
                      );
                    };

                    const renderGroupBlock = (g: string) => {
                      const items = groups[g] ?? [];
                      if (items.length === 0) return null;

                      const enabledCount = items.filter((p) => hasRolePermission(selectedRole, p.id)).length;
                      const allEnabled = enabledCount === items.length;
                      const anyEnabled = enabledCount > 0;

                      return (
                        <div className="space-y-2">
                          {/* Group Header */}
                          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {PERMISSION_GROUP_LABELS[g] ?? g}
                                </span>
                                {!allEnabled && anyEnabled && (
                                  <Badge variant="secondary" className="text-xs rounded-full">
                                    Parziale
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {enabledCount}/{items.length} attivi
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground hidden md:block">
                                Tutto
                              </span>
                              <Switch
                                checked={allEnabled}
                                onCheckedChange={(checked) => {
                                  if (selectedRole === 'owner') return;
                                  if (!checked) {
                                    toggleRolePermissionGroup(selectedRole, g, false);
                                    return;
                                  }
                                  setGroupEnableDialog({ open: true, role: selectedRole, groupKey: g });
                                }}
                                disabled={selectedRole === 'owner'}
                              />
                            </div>
                          </div>

                          {/* Permission List */}
                          <div className="divide-y rounded-xl border overflow-hidden bg-background">
                            {items.map(renderPermissionRow)}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <Tabs defaultValue="openmic" className="space-y-4">
                        <TabsList className="w-full flex flex-wrap justify-start h-auto gap-1 bg-transparent p-0">
                          <TabsTrigger value="openmic" className="rounded-full">
                            <Mic className="w-3 h-3 mr-1" />
                            Open Mic
                          </TabsTrigger>
                          <TabsTrigger value="dediche" className="rounded-full">
                            <Heart className="w-3 h-3 mr-1" />
                            Dediche
                          </TabsTrigger>
                          <TabsTrigger value="community" className="rounded-full">
                            <Users className="w-3 h-3 mr-1" />
                            Community
                          </TabsTrigger>
                          <TabsTrigger value="all" className="rounded-full">
                            Tutti
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="openmic" className="mt-4">
                          {renderGroupBlock('openmic')}
                        </TabsContent>

                        <TabsContent value="dediche" className="mt-4">
                          {renderGroupBlock('dediche')}
                        </TabsContent>

                        <TabsContent value="community" className="mt-4">
                          {renderGroupBlock('community')}
                        </TabsContent>

                        <TabsContent value="all" className="mt-4 space-y-6">
                          {groupKeysInOrder
                            .filter((g, idx, arr) => arr.indexOf(g) === idx)
                            .filter((g) => (groups[g]?.length ?? 0) > 0)
                            .map((g) => (
                              <div key={g}>
                                {renderGroupBlock(g)}
                              </div>
                            ))}
                        </TabsContent>
                      </Tabs>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedRole && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Seleziona un ruolo per gestirne i permessi</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== DIALOGS ========== */}

      {/* Role Change Dialog */}
      <AlertDialog open={showRoleChangeDialog} onOpenChange={setShowRoleChangeDialog}>
        <AlertDialogContent className="sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cambia ruolo</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.profile?.display_name 
                ? `Stai modificando il ruolo di ${selectedUser.profile.display_name}`
                : 'Seleziona il nuovo ruolo per questo utente'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Seleziona ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    {ROLE_ICONS.admin}
                    Admin - Accesso completo customizzabile
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="flex items-center gap-2">
                    {ROLE_ICONS.moderator}
                    Staff - Modifica limitata
                  </div>
                </SelectItem>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    {ROLE_ICONS.user}
                    Utente - Solo accesso base
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} className="rounded-full">
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group Enable Dialog */}
      <AlertDialog
        open={!!groupEnableDialog?.open}
        onOpenChange={(open) => {
          if (!open) setGroupEnableDialog(null);
        }}
      >
        <AlertDialogContent className="sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Abilita sezione</AlertDialogTitle>
            <AlertDialogDescription>
              Come vuoi abilitare <strong>{PERMISSION_GROUP_LABELS[groupEnableDialog?.groupKey ?? ''] ?? groupEnableDialog?.groupKey}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-3 py-2">
            <Button
              variant="default"
              className="rounded-xl justify-start h-auto py-3"
              onClick={async () => {
                if (!groupEnableDialog) return;
                await toggleRolePermissionGroupRecommended(groupEnableDialog.role, groupEnableDialog.groupKey);
                setGroupEnableDialog(null);
              }}
            >
              <div className="text-left">
                <div className="font-medium">Abilitazione consigliata</div>
                <div className="text-xs opacity-80">Solo permessi di visualizzazione (più sicuro)</div>
              </div>
            </Button>
            <Button
              variant="secondary"
              className="rounded-xl justify-start h-auto py-3"
              onClick={async () => {
                if (!groupEnableDialog) return;
                await toggleRolePermissionGroup(groupEnableDialog.role, groupEnableDialog.groupKey, true);
                setGroupEnableDialog(null);
              }}
            >
              <div className="text-left">
                <div className="font-medium">Abilitazione completa</div>
                <div className="text-xs opacity-80">Tutti i permessi della sezione</div>
              </div>
            </Button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={() => setGroupEnableDialog(null)}>
              Annulla
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preset Apply Dialog */}
      <AlertDialog
        open={!!presetApplyDialog?.open}
        onOpenChange={(open) => {
          if (!open) setPresetApplyDialog(null);
        }}
      >
        <AlertDialogContent className="sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {presetApplyDialog?.preset && <presetApplyDialog.preset.icon className="w-5 h-5" />}
              Applica {presetApplyDialog?.preset.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi assegnare il preset <strong>{presetApplyDialog?.preset.label}</strong> a{' '}
              <strong>{presetApplyDialog?.user.profile?.display_name || 'questo utente'}</strong>?
              {presetApplyDialog?.user.role === 'user' && (
                <span className="block mt-2 text-destructive">
                  L'utente verrà anche promosso al ruolo Staff.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-2">Permessi inclusi:</p>
            <div className="flex flex-wrap gap-1">
              {presetApplyDialog?.preset.permissions.map(pName => (
                <Badge key={pName} variant="secondary" className="text-xs">
                  {pName}
                </Badge>
              ))}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={async () => {
                if (!presetApplyDialog) return;
                await applyStaffPreset(presetApplyDialog.user, presetApplyDialog.preset);
                setPresetApplyDialog(null);
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Applica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
