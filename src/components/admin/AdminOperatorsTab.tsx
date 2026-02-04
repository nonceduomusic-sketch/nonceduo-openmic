import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { adminAuditLog } from "@/lib/adminAudit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Plus,
  Bell,
  Music,
  MessageSquare,
  Eye,
  EyeOff,
  Settings2,
  Trash2,
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronUp,
  Pencil,
  Bot,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OperatorUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  permissions: {
    centro_view: boolean;
    openmic_view: boolean;
    openmic_partial: boolean;
    openmic_full: boolean;
    dediche_view: boolean;
    dediche_partial: boolean;
    dediche_full: boolean;
    assistente_view: boolean;
    assistente_manage: boolean;
    assistente_full: boolean;
    trasmetti_view: boolean;
    trasmetti_manage: boolean;
    trasmetti_full: boolean;
  };
};

type PermissionLevel = 'none' | 'view' | 'partial' | 'full';

export function AdminOperatorsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorUser | null>(null);
  const [newOperatorUsername, setNewOperatorUsername] = useState("");
  const [newOperatorPassword, setNewOperatorPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch operators
  const { data: operators = [], isLoading, refetch } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "operator");

      if (roleError) throw roleError;
      if (!roleData?.length) return [];

      const userIds = roleData.map((r) => r.user_id);

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      const { data: userPerms, error: permError } = await supabase
        .from("user_permissions")
        .select("user_id, permission_id, granted, permissions(name)")
        .in("user_id", userIds);

      if (permError) throw permError;

      const result: OperatorUser[] = roleData.map((role) => {
        const profile = profiles?.find((p) => p.user_id === role.user_id);
        const perms = userPerms?.filter((p) => p.user_id === role.user_id) || [];

        const hasPermission = (name: string) => {
          const userPerm = perms.find((p) => (p.permissions as any)?.name === name);
          return userPerm?.granted ?? false;
        };

        return {
          user_id: role.user_id,
          email: profile?.username || "operatore",
          display_name: profile?.display_name,
          role: role.role,
          permissions: {
            centro_view: hasPermission("operator.centro_view") || hasPermission("operator.view_centro"),
            openmic_view: hasPermission("operator.openmic_view") || hasPermission("operator.view_openmic"),
            openmic_partial: hasPermission("operator.openmic_partial") || hasPermission("operator.openmic_manage"),
            openmic_full: hasPermission("operator.openmic_full"),
            dediche_view: hasPermission("operator.dediche_view") || hasPermission("operator.view_dediche"),
            dediche_partial: hasPermission("operator.dediche_partial") || hasPermission("operator.dediche_manage"),
            dediche_full: hasPermission("operator.dediche_full"),
            assistente_view: hasPermission("operator.assistente_view"),
            assistente_manage: hasPermission("operator.assistente_manage"),
            assistente_full: hasPermission("operator.assistente_full"),
            trasmetti_view: hasPermission("operator.trasmetti_view"),
            trasmetti_manage: hasPermission("operator.trasmetti_manage"),
            trasmetti_full: hasPermission("operator.trasmetti_full"),
          },
        };
      });

      return result;
    },
  });

  // Mutation to update a single permission
  const updatePermission = useMutation({
    mutationFn: async ({
      userId,
      permissionName,
      granted,
    }: {
      userId: string;
      permissionName: string;
      granted: boolean;
    }) => {
      const { data: perm } = await supabase
        .from("permissions")
        .select("id")
        .eq("name", permissionName)
        .single();

      if (!perm) throw new Error("Permission not found");

      const { error } = await supabase.from("user_permissions").upsert(
        {
          user_id: userId,
          permission_id: perm.id,
          granted,
        },
        { onConflict: "user_id,permission_id" }
      );

      if (error) throw error;

      adminAuditLog({
        action: "operator.permission_change",
        section: "operators",
        entity: "user_permission",
        entity_id: userId,
        metadata: { permission: permissionName, granted },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
    },
    onError: (err: any) => {
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handlePermissionToggle = (
    operator: OperatorUser,
    permKey: keyof OperatorUser["permissions"],
    value: boolean
  ) => {
    const permMap: Record<string, string> = {
      centro_view: "operator.centro_view",
      openmic_view: "operator.openmic_view",
      openmic_partial: "operator.openmic_partial",
      openmic_full: "operator.openmic_full",
      dediche_view: "operator.dediche_view",
      dediche_partial: "operator.dediche_partial",
      dediche_full: "operator.dediche_full",
      assistente_view: "operator.assistente_view",
      assistente_manage: "operator.assistente_manage",
      assistente_full: "operator.assistente_full",
      trasmetti_view: "operator.trasmetti_view",
      trasmetti_manage: "operator.trasmetti_manage",
      trasmetti_full: "operator.trasmetti_full",
    };

    const permName = permMap[permKey];
    if (!permName) return;

    updatePermission.mutate({
      userId: operator.user_id,
      permissionName: permName,
      granted: value,
    });
  };

  // Helper to set permission level for a section
  const setPermissionLevel = async (operator: OperatorUser, section: string, level: PermissionLevel) => {
    const permKeys: Record<string, (keyof OperatorUser["permissions"])[]> = {
      centro: ['centro_view'],
      openmic: ['openmic_view', 'openmic_partial', 'openmic_full'],
      dediche: ['dediche_view', 'dediche_partial', 'dediche_full'],
      assistente: ['assistente_view', 'assistente_manage', 'assistente_full'],
      trasmetti: ['trasmetti_view', 'trasmetti_manage', 'trasmetti_full'],
    };

    const keys = permKeys[section] || [];
    const grants: Record<PermissionLevel, boolean[]> = {
      none: [false, false, false],
      view: [true, false, false],
      partial: [true, true, false],
      full: [true, true, true],
    };

    const values = grants[level] || [false, false, false];
    
    // Execute mutations sequentially to avoid race conditions
    for (let idx = 0; idx < keys.length; idx++) {
      const key = keys[idx];
      const value = values[idx] ?? false;
      const permMap: Record<string, string> = {
        centro_view: "operator.centro_view",
        openmic_view: "operator.openmic_view",
        openmic_partial: "operator.openmic_partial",
        openmic_full: "operator.openmic_full",
        dediche_view: "operator.dediche_view",
        dediche_partial: "operator.dediche_partial",
        dediche_full: "operator.dediche_full",
        assistente_view: "operator.assistente_view",
        assistente_manage: "operator.assistente_manage",
        assistente_full: "operator.assistente_full",
        trasmetti_view: "operator.trasmetti_view",
        trasmetti_manage: "operator.trasmetti_manage",
        trasmetti_full: "operator.trasmetti_full",
      };
      const permName = permMap[key];
      if (permName) {
        await updatePermission.mutateAsync({
          userId: operator.user_id,
          permissionName: permName,
          granted: value,
        }).catch((err) => {
          console.error(`Failed to update ${permName}:`, err);
        });
      }
    }
    
    // Refetch to ensure UI is up to date
    queryClient.invalidateQueries({ queryKey: ["operators"] });
  };

  // Helper to get current permission level
  const getPermissionLevel = (operator: OperatorUser, section: string): PermissionLevel => {
    const p = operator.permissions;
    switch (section) {
      case 'centro':
        return p.centro_view ? 'view' : 'none';
      case 'openmic':
        if (p.openmic_full) return 'full';
        if (p.openmic_partial) return 'partial';
        if (p.openmic_view) return 'view';
        return 'none';
      case 'dediche':
        if (p.dediche_full) return 'full';
        if (p.dediche_partial) return 'partial';
        if (p.dediche_view) return 'view';
        return 'none';
      case 'assistente':
        if (p.assistente_full) return 'full';
        if (p.assistente_manage) return 'partial';
        if (p.assistente_view) return 'view';
        return 'none';
      case 'trasmetti':
        if (p.trasmetti_full) return 'full';
        if (p.trasmetti_manage) return 'partial';
        if (p.trasmetti_view) return 'view';
        return 'none';
      default:
        return 'none';
    }
  };

  // Create new operator
  const handleCreateOperator = async () => {
    if (!newOperatorUsername || !newOperatorPassword) {
      toast({ title: "Dati mancanti", description: "Inserisci username e password", variant: "destructive" });
      return;
    }
    if (newOperatorUsername.length < 3) {
      toast({ title: "Username troppo corto", description: "Min 3 caratteri", variant: "destructive" });
      return;
    }
    if (newOperatorPassword.length < 6) {
      toast({ title: "Password troppo corta", description: "Min 6 caratteri", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-credentials-update", {
        body: { action: "create", username: newOperatorUsername.trim().toLowerCase(), password: newOperatorPassword, role: "operator" },
      });
      if (error) throw error;

      adminAuditLog({ action: "operator.create", section: "operators", entity: "user", metadata: { username: newOperatorUsername } });
      toast({ title: "Operatore creato", description: newOperatorUsername });
      setShowCreateDialog(false);
      setNewOperatorUsername("");
      setNewOperatorPassword("");
      setShowPassword(false);
      refetch();
    } catch (err: any) {
      toast({ title: "Errore creazione", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  // Delete operator
  const handleDeleteOperator = async (userId: string) => {
    try {
      const operator = operators.find(op => op.user_id === userId);
      if (!operator) {
        toast({ title: "Errore", description: "Operatore non trovato", variant: "destructive" });
        return;
      }
      const username = operator.display_name || operator.email;
      const { error } = await supabase.functions.invoke("admin-credentials-update", {
        body: { action: "deleteOperator", username },
      });
      if (error) throw error;

      adminAuditLog({ action: "operator.delete", section: "operators", entity: "user", entity_id: userId, metadata: { username } });
      toast({ title: "Operatore eliminato" });
      setShowDeleteDialog(null);
      refetch();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  // Edit credentials
  const handleEditCredentials = async () => {
    if (!editingOperator) return;
    const originalUsername = editingOperator.display_name || editingOperator.email;
    const usernameChanged = editUsername.trim() && editUsername.trim() !== originalUsername;
    const passwordChanged = editPassword.trim().length > 0;

    if (!usernameChanged && !passwordChanged) {
      toast({ title: "Nessuna modifica", description: "Modifica almeno username o password", variant: "destructive" });
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-credentials-update", {
        body: {
          action: "updateCredentials",
          username: originalUsername,
          newUsername: usernameChanged ? editUsername.trim() : undefined,
          password: passwordChanged ? editPassword : undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Errore");

      toast({ title: "Credenziali aggiornate" });
      setShowEditDialog(false);
      setEditingOperator(null);
      setEditUsername("");
      setEditPassword("");
      refetch();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gestione Operatori
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configura i permessi per ogni operatore su 5 sezioni.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nuovo
        </Button>
      </div>

      {/* Operators List */}
      {operators.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <User className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">Nessun operatore</h3>
            <p className="text-sm text-muted-foreground mb-4">Crea il primo operatore per gestire gli eventi</p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Crea Operatore
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {operators.map((operator) => (
            <Card key={operator.user_id} className={cn("transition-all", expandedUserId === operator.user_id && "ring-2 ring-primary/20")}>
              <CardHeader
                className="cursor-pointer py-4"
                onClick={() => setExpandedUserId(expandedUserId === operator.user_id ? null : operator.user_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{operator.display_name || operator.email}</CardTitle>
                      <CardDescription className="text-xs">{operator.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-wrap">
                      {operator.permissions.centro_view && <Badge variant="secondary" className="text-[10px] px-1.5"><Bell className="w-3 h-3" /></Badge>}
                      {(operator.permissions.openmic_view || operator.permissions.openmic_partial || operator.permissions.openmic_full) && <Badge variant="secondary" className="text-[10px] px-1.5"><Music className="w-3 h-3" /></Badge>}
                      {(operator.permissions.dediche_view || operator.permissions.dediche_partial || operator.permissions.dediche_full) && <Badge variant="secondary" className="text-[10px] px-1.5"><MessageSquare className="w-3 h-3" /></Badge>}
                      {(operator.permissions.assistente_view || operator.permissions.assistente_manage || operator.permissions.assistente_full) && <Badge variant="secondary" className="text-[10px] px-1.5"><Bot className="w-3 h-3" /></Badge>}
                      {(operator.permissions.trasmetti_view || operator.permissions.trasmetti_manage || operator.permissions.trasmetti_full) && <Badge variant="secondary" className="text-[10px] px-1.5"><Tv className="w-3 h-3" /></Badge>}
                    </div>
                    {expandedUserId === operator.user_id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>

              {expandedUserId === operator.user_id && (
                <CardContent className="pt-0 space-y-6">
                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Permessi per Sezione
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Centro */}
                      <div className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Centro</span>
                        </div>
                        <div className="flex items-center justify-between pl-6">
                          <span className="text-sm text-muted-foreground">Accesso</span>
                          <Switch checked={operator.permissions.centro_view} onCheckedChange={(v) => handlePermissionToggle(operator, "centro_view", v)} />
                        </div>
                      </div>

                      {/* Open Mic */}
                      <div className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Open Mic</span>
                        </div>
                        <div className="space-y-2 pl-6">
                          {(['none', 'view', 'partial', 'full'] as PermissionLevel[]).map(level => (
                            <Label key={level} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name={`openmic-${operator.user_id}`} checked={getPermissionLevel(operator, 'openmic') === level} onChange={() => setPermissionLevel(operator, 'openmic', level)} className="accent-primary" />
                              {level === 'none' && 'Nessun accesso'}
                              {level === 'view' && 'Solo visualizzazione'}
                              {level === 'partial' && 'Gestione parziale'}
                              {level === 'full' && 'Gestione completa'}
                            </Label>
                          ))}
                        </div>
                      </div>

                      {/* Dediche */}
                      <div className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Dediche</span>
                        </div>
                        <div className="space-y-2 pl-6">
                          {(['none', 'view', 'partial', 'full'] as PermissionLevel[]).map(level => (
                            <Label key={level} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name={`dediche-${operator.user_id}`} checked={getPermissionLevel(operator, 'dediche') === level} onChange={() => setPermissionLevel(operator, 'dediche', level)} className="accent-primary" />
                              {level === 'none' && 'Nessun accesso'}
                              {level === 'view' && 'Solo visualizzazione'}
                              {level === 'partial' && 'Gestione parziale'}
                              {level === 'full' && 'Gestione completa'}
                            </Label>
                          ))}
                        </div>
                      </div>

                      {/* Assistente */}
                      <div className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Assistente</span>
                        </div>
                        <div className="space-y-2 pl-6">
                          {(['none', 'view', 'partial', 'full'] as PermissionLevel[]).map(level => (
                            <Label key={level} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name={`assistente-${operator.user_id}`} checked={getPermissionLevel(operator, 'assistente') === level} onChange={() => setPermissionLevel(operator, 'assistente', level)} className="accent-primary" />
                              {level === 'none' && 'Nessun accesso'}
                              {level === 'view' && 'Solo visualizzazione'}
                              {level === 'partial' && 'Gestione parziale'}
                              {level === 'full' && 'Gestione completa'}
                            </Label>
                          ))}
                        </div>
                      </div>

                      {/* Trasmetti */}
                      <div className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-center gap-2">
                          <Tv className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Trasmetti</span>
                        </div>
                        <div className="space-y-2 pl-6">
                          {(['none', 'view', 'partial', 'full'] as PermissionLevel[]).map(level => (
                            <Label key={level} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name={`trasmetti-${operator.user_id}`} checked={getPermissionLevel(operator, 'trasmetti') === level} onChange={() => setPermissionLevel(operator, 'trasmetti', level)} className="accent-primary" />
                              {level === 'none' && 'Nessun accesso'}
                              {level === 'view' && 'Solo visualizzazione'}
                              {level === 'partial' && 'Gestione parziale'}
                              {level === 'full' && 'Gestione completa'}
                            </Label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { setEditingOperator(operator); setEditUsername(operator.display_name || operator.email); setEditPassword(""); setShowEditDialog(true); }}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifica Credenziali
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteDialog(operator.user_id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Rimuovi
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Info box */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Legenda:</strong> Gestione parziale = può modificare ma non eliminare. Gestione completa = accesso totale alla sezione.
          </p>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) { setNewOperatorUsername(""); setNewOperatorPassword(""); setShowPassword(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Operatore</DialogTitle>
            <DialogDescription>Crea un account operatore per gestire gli eventi dal vivo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" placeholder="es. mario_rossi" value={newOperatorUsername} onChange={(e) => setNewOperatorUsername(e.target.value)} maxLength={50} autoComplete="off" />
              <p className="text-xs text-muted-foreground">Min 3 caratteri</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={newOperatorPassword} onChange={(e) => setNewOperatorPassword(e.target.value)} maxLength={100} className="pr-10" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Min 6 caratteri</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annulla</Button>
            <Button onClick={handleCreateOperator} disabled={isCreating}>
              {isCreating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi Operatore</AlertDialogTitle>
            <AlertDialogDescription>L'operatore non potrà più accedere alla dashboard admin.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => showDeleteDialog && handleDeleteOperator(showDeleteDialog)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Rimuovi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Credentials Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) { setEditingOperator(null); setEditUsername(""); setEditPassword(""); setShowEditPassword(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" />Modifica Credenziali</DialogTitle>
            <DialogDescription>Modifica username e/o password per <strong>{editingOperator?.display_name || editingOperator?.email}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input id="edit-username" type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Nuovo username" maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nuova Password</Label>
              <div className="relative">
                <Input id="edit-password" type={showEditPassword ? "text" : "password"} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Lascia vuoto per non cambiare" className="pr-10" maxLength={100} />
                <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annulla</Button>
            <Button onClick={handleEditCredentials} disabled={isEditing || (!editPassword.trim() && editUsername === (editingOperator?.display_name || editingOperator?.email))}>
              {isEditing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
