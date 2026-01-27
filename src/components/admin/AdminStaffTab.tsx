import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  RefreshCw, 
  Trash2,
  Shield,
  ShieldCheck,
  Crown,
  UserPlus,
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react';

interface AdminUser {
  username: string;
  created_at: string;
  role: string;
}

type StaffRole = 'owner' | 'admin' | 'moderator';

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Staff',
};

const ROLE_COLORS: Record<StaffRole, string> = {
  owner: 'bg-warning/20 text-warning border-warning/30',
  admin: 'bg-secondary/20 text-secondary border-secondary/30',
  moderator: 'bg-accent/20 text-accent border-accent/30',
};

export const AdminStaffTab: React.FC = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<AdminUser | null>(null);
  
  // New staff creation
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'moderator'>('moderator');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit credentials
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-credentials-update', {
        body: { action: 'listAdmins' }
      });

      if (error) {
        console.error('Error listing staff:', error);
        toast.error('Solo Owner può vedere/gestire lo Staff');
        setAdminUsers([]);
      } else {
        setAdminUsers(data?.admins ?? []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Errore nel caricamento staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

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
      setShowCreateDialog(false);
      setNewStaffUsername('');
      setNewStaffPassword('');
      setNewStaffRole('moderator');
      fetchStaff();
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
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Impossibile eliminare lo staff');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditCredentials = async () => {
    if (!selectedStaff) return;

    // Validate at least one change
    const usernameChanged = editUsername.trim() && editUsername.trim() !== selectedStaff.username;
    const passwordChanged = editPassword.trim().length > 0;

    if (!usernameChanged && !passwordChanged) {
      toast.error('Modifica almeno username o password');
      return;
    }

    if (usernameChanged && editUsername.trim().length < 3) {
      toast.error('Username deve avere almeno 3 caratteri');
      return;
    }

    if (passwordChanged && editPassword.length < 6) {
      toast.error('Password deve avere almeno 6 caratteri');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-credentials-update', {
        body: { 
          action: 'updateCredentials',
          username: selectedStaff.username,
          newUsername: usernameChanged ? editUsername.trim() : undefined,
          password: passwordChanged ? editPassword : undefined,
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Errore');
      }

      const changes = [];
      if (usernameChanged) changes.push('username');
      if (passwordChanged) changes.push('password');
      
      toast.success(`Credenziali aggiornate (${changes.join(', ')})`);
      setShowEditDialog(false);
      setEditUsername('');
      setEditPassword('');
      setSelectedStaff(null);
      fetchStaff();
    } catch (error: any) {
      console.error('Error updating credentials:', error);
      toast.error(error.message || 'Impossibile aggiornare le credenziali');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Gestione Staff
          </h2>
          <p className="text-sm text-muted-foreground">
            {adminUsers.length} membri dello staff configurati
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={fetchStaff} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="flex-1 sm:flex-none">
            <UserPlus className="w-4 h-4 mr-2" />
            Nuovo Staff
          </Button>
        </div>
      </div>

      {/* Staff List */}
      {adminUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nessuno staff configurato</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {adminUsers.map((admin) => {
            const isOwner = admin.role === 'owner';
            const roleKey = admin.role as StaffRole;
            
            return (
              <Card key={admin.username} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                          isOwner
                            ? 'bg-warning/20'
                            : admin.role === 'admin'
                              ? 'bg-secondary/20'
                              : 'bg-accent/20'
                        }`}
                      >
                        {isOwner ? (
                          <Crown className="w-6 h-6 text-warning" />
                        ) : admin.role === 'admin' ? (
                          <Shield className="w-6 h-6 text-secondary" />
                        ) : (
                          <ShieldCheck className="w-6 h-6 text-accent" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-base truncate">{admin.username}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={ROLE_COLORS[roleKey]}>
                            {ROLE_LABELS[roleKey]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(admin.created_at).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Edit Credentials */}
                      {!isOwner && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setSelectedStaff(admin);
                            setEditUsername(admin.username);
                            setEditPassword('');
                            setShowEditDialog(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Delete */}
                      {!isOwner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isProcessing}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Elimina Staff</AlertDialogTitle>
                              <AlertDialogDescription>
                                Sei sicuro di voler eliminare <strong>{admin.username}</strong>? 
                                Non avrà più accesso al pannello admin.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteStaff(admin.username)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Staff Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateStaff} disabled={isProcessing || !newStaffUsername.trim() || !newStaffPassword.trim()}>
              {isProcessing ? 'Creazione...' : 'Crea Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Credentials Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditUsername('');
          setEditPassword('');
          setShowEditPassword(false);
          setSelectedStaff(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Modifica Credenziali
            </DialogTitle>
            <DialogDescription>
              Modifica username e/o password per <strong>{selectedStaff?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Nuovo username"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Lascia invariato per mantenere l'username attuale
              </p>
            </div>
            <div className="space-y-2">
              <Label>Nuova Password</Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Lascia vuoto per non cambiare"
                  className="pr-10"
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Lascia vuoto per mantenere la password attuale
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditUsername('');
              setEditPassword('');
              setSelectedStaff(null);
            }}>
              Annulla
            </Button>
            <Button 
              onClick={handleEditCredentials} 
              disabled={isProcessing || (!editPassword.trim() && editUsername === selectedStaff?.username)}
            >
              {isProcessing ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
