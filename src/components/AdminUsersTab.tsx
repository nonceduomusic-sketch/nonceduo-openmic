import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  RefreshCw, 
  MoreVertical,
  KeyRound,
  Trash2,
  Edit,
  Shield,
  ShieldCheck,
  Crown,
  User,
  Circle,
  AlertTriangle,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  role?: 'owner' | 'admin' | 'moderator' | 'user';
}

interface AdminUser {
  username: string;
  created_at: string;
  role: string;
}

type AppRole = 'owner' | 'admin' | 'moderator' | 'user';

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  owner: <Crown className="w-3.5 h-3.5" />,
  admin: <Shield className="w-3.5 h-3.5" />,
  moderator: <ShieldCheck className="w-3.5 h-3.5" />,
  user: <User className="w-3.5 h-3.5" />,
};

const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Staff',
  user: 'Utente',
};

const ROLE_COLORS: Record<AppRole, string> = {
  // Use semantic design tokens only (no raw Tailwind colors)
  owner: 'bg-warning/20 text-warning border-warning/30',
  admin: 'bg-secondary/20 text-secondary border-secondary/30',
  moderator: 'bg-accent/20 text-accent border-accent/30',
  user: 'bg-muted text-muted-foreground border-border',
};

export const AdminUsersTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'community' | 'staff'>('community');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showCreateStaffDialog, setShowCreateStaffDialog] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('moderator');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New staff creation
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'moderator'>('moderator');
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch community profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      // Map profiles with roles
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        role: (roleMap.get(profile.user_id) as AppRole) || 'user',
      }));

      setUsers(usersWithRoles);

      // Fetch admin users (staff)
      const { data, error } = await supabase.functions.invoke('admin-credentials-update', {
        body: { action: 'listAdmins' }
      });

      if (!error && data?.admins) {
        setAdminUsers(data.admins);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Impossibile caricare gli utenti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatLastSeen = (date: string): string => {
    const now = new Date();
    const lastSeen = new Date(date);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h fa`;
    return `${Math.floor(diffMins / 1440)}g fa`;
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditDisplayName(user.display_name || '');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);

    try {
      if (editDisplayName && editDisplayName !== selectedUser.display_name) {
        const { error } = await supabase
          .from('profiles')
          .update({ display_name: editDisplayName })
          .eq('user_id', selectedUser.user_id);

        if (error) throw error;
      }

      toast.success('Utente aggiornato');
      setShowEditDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Impossibile aggiornare l\'utente');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);

    try {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', selectedUser.user_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: newRole });

        if (error) throw error;
      }

      toast.success(`Ruolo cambiato a ${ROLE_LABELS[newRole]}`);
      setShowRoleDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Impossibile cambiare il ruolo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast.success(`Profilo di ${selectedUser.display_name} eliminato`);
      setShowDeleteDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Impossibile eliminare l\'utente');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!newStaffUsername.trim() || !newStaffPassword.trim()) {
      toast.error('Inserisci username e password');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-credentials-update', {
        body: { 
          action: 'upsertAdmin',
          username: newStaffUsername.trim(),
          password: newStaffPassword,
          role: newStaffRole
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Errore nella creazione');
      }

      toast.success(`${newStaffRole === 'admin' ? 'Admin' : 'Staff'} "${newStaffUsername}" creato`);
      setShowCreateStaffDialog(false);
      setNewStaffUsername('');
      setNewStaffPassword('');
      setNewStaffRole('moderator');
      fetchUsers();
    } catch (error) {
      console.error('Error creating staff:', error);
      toast.error('Impossibile creare lo staff');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteStaff = async (username: string) => {
    if (username.toLowerCase() === 'iacopo') {
      toast.error('Non puoi eliminare il proprietario');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-credentials-update', {
        body: { action: 'deleteAdmin', username }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Errore');
      }

      toast.success(`Staff "${username}" eliminato`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Impossibile eliminare lo staff');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineCount = users.filter(u => u.is_online).length;
  const staffCount = users.filter(u => u.role && u.role !== 'user').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Gestione Utenti
          </h2>
          <p className="text-sm text-muted-foreground">
            {users.length} community · {staffCount} staff · {onlineCount} online
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'community' | 'staff')}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="community" className="gap-2">
            <Users className="w-4 h-4" />
            Community ({users.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Shield className="w-4 h-4" />
            Staff ({adminUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Community Tab */}
        <TabsContent value="community" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca utente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nessun utente trovato' : 'Nessun utente registrato'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {getInitials(user.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        {user.is_online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-background" />
                        )}
                      </div>
                      
                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <p className="font-medium text-sm break-words leading-snug min-w-0">
                            {user.display_name}
                          </p>
                          {user.role && user.role !== 'user' && (
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-xs whitespace-nowrap ${ROLE_COLORS[user.role]}`}
                            >
                              {ROLE_ICONS[user.role]}
                              <span className="ml-1">{ROLE_LABELS[user.role]}</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground break-words leading-snug">@{user.username}</p>
                      </div>
                      
                      {/* Status */}
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Circle className={`w-2 h-2 ${user.is_online ? 'fill-secondary text-secondary' : 'fill-muted-foreground/30 text-muted-foreground/30'}`} />
                        <span>{user.is_online ? 'Online' : formatLastSeen(user.last_seen_at)}</span>
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role || 'user');
                            setShowRoleDialog(true);
                          }}>
                            <Crown className="w-4 h-4 mr-2" />
                            Cambia ruolo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          <Button 
            onClick={() => setShowCreateStaffDialog(true)}
            className="w-full"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Aggiungi Staff
          </Button>

          {adminUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Nessuno staff configurato</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {adminUsers.map((admin) => {
                const isOwner = admin.role === 'owner';
                const roleKey = admin.role as AppRole;
                
                return (
                  <Card key={admin.username}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isOwner
                                ? 'bg-warning/20'
                                : admin.role === 'admin'
                                  ? 'bg-secondary/20'
                                  : 'bg-accent/20'
                            }`}
                          >
                            {isOwner ? (
                              <Crown className="w-5 h-5 text-warning" />
                            ) : admin.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-secondary" />
                            ) : (
                              <ShieldCheck className="w-5 h-5 text-accent" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{admin.username}</p>
                            <Badge variant="outline" className={ROLE_COLORS[roleKey]}>
                              {ROLE_LABELS[roleKey]}
                            </Badge>
                          </div>
                        </div>
                        
                        {!isOwner && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteStaff(admin.username)}
                            disabled={isProcessing}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Utente</DialogTitle>
            <DialogDescription>
              Modifica le informazioni di {selectedUser?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome visualizzato</Label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Nome utente"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleSaveEdit} disabled={isProcessing}>
              {isProcessing ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambia Ruolo</DialogTitle>
            <DialogDescription>
              Scegli il nuovo ruolo per {selectedUser?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-secondary" />
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    Staff (Moderatore)
                  </div>
                </SelectItem>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Utente normale
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleChangeRole} disabled={isProcessing}>
              {isProcessing ? 'Salvataggio...' : 'Conferma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Elimina Profilo
            </DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il profilo di <strong>{selectedUser?.display_name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isProcessing}>
              {isProcessing ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Staff Dialog */}
      <Dialog open={showCreateStaffDialog} onOpenChange={setShowCreateStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Nuovo Staff
            </DialogTitle>
            <DialogDescription>
              Crea un nuovo account staff per accedere al pannello admin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={newStaffUsername}
                onChange={(e) => setNewStaffUsername(e.target.value)}
                placeholder="es. Mario"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Password sicura"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select value={newStaffRole} onValueChange={(v) => setNewStaffRole(v as 'admin' | 'moderator')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-secondary" />
                      Admin (accesso completo)
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                      Staff (permessi limitati)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateStaffDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateStaff} disabled={isProcessing || !newStaffUsername.trim() || !newStaffPassword.trim()}>
              {isProcessing ? 'Creazione...' : 'Crea Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
