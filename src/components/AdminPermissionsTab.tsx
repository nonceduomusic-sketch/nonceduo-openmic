import React, { useState, useEffect, useCallback } from 'react';
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
  UserPlus,
  Settings,
  Check,
  X
} from 'lucide-react';

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
  user_email?: string;
}

interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  granted_by: string | null;
}

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
  social: 'Social',
  admin: 'Admin',
  altro: 'Altro',
};

const PRIMARY_PERMISSION_GROUPS = ['openmic', 'dediche', 'community'] as const;

type AppRole = 'owner' | 'admin' | 'moderator' | 'user';

const ROLE_COLORS: Record<AppRole, string> = {
  owner: 'bg-accent text-accent-foreground',
  admin: 'bg-primary/10 text-primary',
  moderator: 'bg-secondary text-secondary-foreground',
  user: 'bg-muted text-muted-foreground',
};

export const AdminPermissionsTab: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissionOverride[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [permSearch, setPermSearch] = useState('');
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('admin');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch permissions
      const { data: permsData, error: permsError } = await supabase
        .from('permissions')
        .select('*')
        .order('name');
      
      if (permsError) throw permsError;
      setPermissions(permsData || []);

      // Fetch role permissions
      const { data: rolePermsData, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (rolePermsError) throw rolePermsError;
      setRolePermissions(rolePermsData || []);

      // Fetch user roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('role', { ascending: true });
      
      if (userRolesError) throw userRolesError;
      setUserRoles(userRolesData || []);

      // Fetch user permission overrides
      const { data: userPermsData, error: userPermsError } = await supabase
        .from('user_permissions')
        .select('*');
      
      if (userPermsError) throw userPermsError;
      setUserPermissions(userPermsData || []);

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

  const toggleRolePermissionGroup = async (
    role: AppRole,
    groupKey: string,
    enable: boolean,
  ) => {
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
        // Insert missing only (ignore duplicates)
        const existing = new Set(
          rolePermissions
            .filter((rp) => rp.role === role)
            .map((rp) => rp.permission_id),
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

  const toggleRolePermission = async (role: AppRole, permissionId: string, hasPermission: boolean) => {
    try {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role)
          .eq('permission_id', permissionId);
        
        if (error) throw error;
      } else {
        // Add permission
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
      // Update the role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as AppRole })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'Ruolo aggiornato',
        description: `Ruolo cambiato a ${ROLE_LABELS[newRole]}`,
      });

      adminAuditLog({
        action: 'users.role_change',
        section: 'settings',
        entity: 'user_roles',
        entity_id: selectedUser.user_id,
        metadata: { from: selectedUser.role, to: newRole },
      });

      setShowRoleChangeDialog(false);
      setSelectedUser(null);
      setNewRole('admin');
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

  const filteredUsers = userRoles.filter(ur => {
    if (!searchQuery) return true;
    return ur.user_id.toLowerCase().includes(searchQuery.toLowerCase());
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
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestione Permessi</h2>
          <p className="text-muted-foreground">
            Gestisci ruoli e permessi degli utenti
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <User className="w-4 h-4" />
            Utenti ({userRoles.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Settings className="w-4 h-4" />
            Ruoli
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per ID utente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4">
            {(['owner', 'admin', 'moderator', 'user'] as const).map(role => (
              groupedUsers[role].length > 0 && (
                <Card key={role}>
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {ROLE_ICONS[role]}
                      {ROLE_LABELS[role]}
                      <Badge variant="secondary">{groupedUsers[role].length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ScrollArea className="max-h-60">
                      <div className="space-y-2">
                        {groupedUsers[role].map(user => (
                          <div 
                            key={user.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <Badge className={ROLE_COLORS[user.role]}>
                                {ROLE_LABELS[user.role]}
                              </Badge>
                              <code className="text-xs bg-background px-2 py-1 rounded">
                                {user.user_id.slice(0, 8)}...
                              </code>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.role as AppRole);
                                setShowRoleChangeDialog(true);
                              }}
                              disabled={role === 'owner'}
                            >
                              Cambia ruolo
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun utente trovato</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            {(['owner', 'admin', 'moderator', 'user'] as const).map(role => (
              <Card 
                key={role}
                className={`cursor-pointer transition-all ${
                  selectedRole === role ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedRole(selectedRole === role ? null : role)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    {ROLE_ICONS[role]}
                    {ROLE_LABELS[role]}
                  </CardTitle>
                  <CardDescription>
                    {getRolePermissions(role).length} permessi
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {selectedRole && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {ROLE_ICONS[selectedRole]}
                  Permessi per {ROLE_LABELS[selectedRole]}
                </CardTitle>
                <CardDescription>
                  Attiva o disattiva i permessi per questo ruolo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      placeholder="Cerca (opzionale) — es. reset, manage_groups, settings…"
                      className="pl-10"
                    />
                  </div>

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
                      const hasPermission = hasRolePermission(selectedRole, permission.id);
                      const isOwnerOnly = permission.name === 'manage_owners';
                      const isDisabled =
                        (selectedRole === ('owner' as AppRole)) ||
                        (isOwnerOnly && selectedRole !== ('owner' as AppRole));

                      const prettyName = permission.name.includes('.')
                        ? permission.name.replace(/\./g, ' › ')
                        : permission.name;

                      return (
                        <div
                          key={permission.id}
                          className="flex items-start justify-between gap-4 py-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <Label className="font-medium break-words">
                              {prettyName}
                            </Label>
                            <p className="text-sm text-muted-foreground break-words">
                              {permission.description}
                            </p>
                          </div>
                          <div className="shrink-0 pt-1">
                            <Switch
                              checked={hasPermission}
                              onCheckedChange={() =>
                                toggleRolePermission(selectedRole, permission.id, hasPermission)
                              }
                              disabled={isDisabled}
                            />
                          </div>
                        </div>
                      );
                    };

                    const renderGroupBlock = (g: string) => {
                      const items = groups[g] ?? [];
                      if (items.length === 0) {
                        return (
                          <div className="text-sm text-muted-foreground py-6">
                            Nessun permesso in questa sezione.
                          </div>
                        );
                      }

                      const enabledCount = items.filter((p) => hasRolePermission(selectedRole, p.id)).length;
                      const allEnabled = enabledCount === items.length;
                      const anyEnabled = enabledCount > 0;

                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {PERMISSION_GROUP_LABELS[g] ?? g}
                                </span>
                                {!allEnabled && anyEnabled && (
                                  <Badge variant="secondary">Parziale</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {enabledCount}/{items.length} permessi attivi
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Tutto</span>
                              <Switch
                                checked={allEnabled}
                                onCheckedChange={(checked) =>
                                  toggleRolePermissionGroup(selectedRole, g, checked)
                                }
                                disabled={selectedRole === ('owner' as AppRole)}
                              />
                            </div>
                          </div>

                          <div className="divide-y">
                            {items.map(renderPermissionRow)}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <Tabs defaultValue="openmic" className="space-y-4">
                        <TabsList className="w-full flex flex-wrap justify-start h-auto">
                          <TabsTrigger value="openmic">Open Mic</TabsTrigger>
                          <TabsTrigger value="dediche">Dediche</TabsTrigger>
                          <TabsTrigger value="community">Community</TabsTrigger>
                          <TabsTrigger value="all">Tutti</TabsTrigger>
                        </TabsList>

                        <TabsContent value="openmic" className="space-y-2">
                          {renderGroupBlock('openmic')}
                        </TabsContent>

                        <TabsContent value="dediche" className="space-y-2">
                          {renderGroupBlock('dediche')}
                        </TabsContent>

                        <TabsContent value="community" className="space-y-2">
                          {renderGroupBlock('community')}
                        </TabsContent>

                        <TabsContent value="all" className="space-y-6">
                          {groupKeysInOrder
                            .filter((g, idx, arr) => arr.indexOf(g) === idx)
                            .filter((g) => (groups[g]?.length ?? 0) > 0)
                            .map((g) => (
                              <div key={g} className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Separator className="flex-1" />
                                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                    {PERMISSION_GROUP_LABELS[g] ?? g}
                                  </span>
                                  <Separator className="flex-1" />
                                </div>
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
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Seleziona un ruolo per gestirne i permessi</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Role Change Dialog */}
      <AlertDialog open={showRoleChangeDialog} onOpenChange={setShowRoleChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambia ruolo utente</AlertDialogTitle>
            <AlertDialogDescription>
              Seleziona il nuovo ruolo per questo utente
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    {ROLE_ICONS.admin}
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="flex items-center gap-2">
                    {ROLE_ICONS.moderator}
                    Staff
                  </div>
                </SelectItem>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    {ROLE_ICONS.user}
                    Utente
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
