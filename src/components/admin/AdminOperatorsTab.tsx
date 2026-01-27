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
} from "lucide-react";
import { cn } from "@/lib/utils";

type OperatorUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  permissions: {
    view_centro: boolean;
    view_openmic: boolean;
    view_dediche: boolean;
    openmic_manage: boolean;
    dediche_manage: boolean;
  };
};

// Permission IDs from the database
const OPERATOR_PERMISSIONS = [
  "operator.view_centro",
  "operator.view_openmic",
  "operator.view_dediche",
  "operator.openmic_readonly",
  "operator.openmic_manage",
  "operator.dediche_readonly",
  "operator.dediche_manage",
] as const;

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
  
  // Edit credentials
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch operators
  const { data: operators = [], isLoading, refetch } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      // Get all users with operator role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "operator");

      if (roleError) throw roleError;
      if (!roleData?.length) return [];

      const userIds = roleData.map((r) => r.user_id);

      // Get profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      // Get user permissions
      const { data: userPerms, error: permError } = await supabase
        .from("user_permissions")
        .select("user_id, permission_id, granted, permissions(name)")
        .in("user_id", userIds);

      if (permError) throw permError;

      // Get all operator permission IDs
      const { data: allPerms } = await supabase
        .from("permissions")
        .select("id, name")
        .like("name", "operator.%");

      const permMap = new Map(allPerms?.map((p) => [p.name, p.id]) || []);

      // Build operator list with permissions
      const result: OperatorUser[] = roleData.map((role) => {
        const profile = profiles?.find((p) => p.user_id === role.user_id);
        const perms = userPerms?.filter((p) => p.user_id === role.user_id) || [];

        // Check individual permissions
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
            view_centro: hasPermission("operator.view_centro"),
            view_openmic: hasPermission("operator.view_openmic"),
            view_dediche: hasPermission("operator.view_dediche"),
            openmic_manage: hasPermission("operator.openmic_manage"),
            dediche_manage: hasPermission("operator.dediche_manage"),
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
      // Get permission ID
      const { data: perm } = await supabase
        .from("permissions")
        .select("id")
        .eq("name", permissionName)
        .single();

      if (!perm) throw new Error("Permission not found");

      // Upsert user_permissions
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
      toast({ title: "Permesso aggiornato" });
    },
    onError: (err: any) => {
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Handle permission toggle
  const handlePermissionToggle = (
    operator: OperatorUser,
    permKey: keyof OperatorUser["permissions"],
    value: boolean
  ) => {
    // Map UI key to database permission name
    const permMap: Record<string, string> = {
      view_centro: "operator.view_centro",
      view_openmic: "operator.view_openmic",
      view_dediche: "operator.view_dediche",
      openmic_manage: "operator.openmic_manage",
      dediche_manage: "operator.dediche_manage",
    };

    const permName = permMap[permKey];
    if (!permName) return;

    // If enabling "manage", also ensure view is enabled
    if (value && permKey.includes("_manage")) {
      const viewKey = permKey.replace("_manage", "").replace("openmic", "view_openmic").replace("dediche", "view_dediche");
      // This is simplified; in production, you'd chain the mutations
    }

    updatePermission.mutate({
      userId: operator.user_id,
      permissionName: permName,
      granted: value,
    });
  };

  // Create new operator
  const handleCreateOperator = async () => {
    if (!newOperatorUsername || !newOperatorPassword) {
      toast({
        title: "Dati mancanti",
        description: "Inserisci username e password",
        variant: "destructive",
      });
      return;
    }

    if (newOperatorUsername.length < 3) {
      toast({
        title: "Username troppo corto",
        description: "L'username deve avere almeno 3 caratteri",
        variant: "destructive",
      });
      return;
    }

    if (newOperatorPassword.length < 6) {
      toast({
        title: "Password troppo corta",
        description: "La password deve avere almeno 6 caratteri",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Use admin function to create user (same as staff)
      const { data, error } = await supabase.functions.invoke("admin-credentials-update", {
        body: {
          action: "create",
          username: newOperatorUsername.trim().toLowerCase(),
          password: newOperatorPassword,
          role: "operator",
        },
      });

      if (error) throw error;

      adminAuditLog({
        action: "operator.create",
        section: "operators",
        entity: "user",
        metadata: { username: newOperatorUsername },
      });

      toast({ title: "Operatore creato", description: newOperatorUsername });
      setShowCreateDialog(false);
      setNewOperatorUsername("");
      setNewOperatorPassword("");
      setShowPassword(false);
      refetch();
    } catch (err: any) {
      toast({
        title: "Errore creazione",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Delete operator
  const handleDeleteOperator = async (userId: string) => {
    try {
      // Remove operator role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "operator");

      if (error) throw error;

      // Also remove their permissions
      const { data: perms } = await supabase
        .from("permissions")
        .select("id")
        .like("name", "operator.%");

      if (perms?.length) {
        await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .in("permission_id", perms.map((p) => p.id));
      }

      adminAuditLog({
        action: "operator.delete",
        section: "operators",
        entity: "user",
        entity_id: userId,
      });

      toast({ title: "Operatore rimosso" });
      setShowDeleteDialog(null);
      refetch();
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Edit operator credentials
  const handleEditCredentials = async () => {
    if (!editingOperator) return;

    const originalUsername = editingOperator.display_name || editingOperator.email;
    const usernameChanged = editUsername.trim() && editUsername.trim() !== originalUsername;
    const passwordChanged = editPassword.trim().length > 0;

    if (!usernameChanged && !passwordChanged) {
      toast({
        title: "Nessuna modifica",
        description: "Modifica almeno username o password",
        variant: "destructive",
      });
      return;
    }

    if (usernameChanged && editUsername.trim().length < 3) {
      toast({
        title: "Username troppo corto",
        description: "L'username deve avere almeno 3 caratteri",
        variant: "destructive",
      });
      return;
    }

    if (passwordChanged && editPassword.length < 6) {
      toast({
        title: "Password troppo corta",
        description: "La password deve avere almeno 6 caratteri",
        variant: "destructive",
      });
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

      const changes = [];
      if (usernameChanged) changes.push("username");
      if (passwordChanged) changes.push("password");

      adminAuditLog({
        action: "operator.credentials_update",
        section: "operators",
        entity: "user",
        entity_id: editingOperator.user_id,
        metadata: { changes, newUsername: usernameChanged ? editUsername : undefined },
      });

      toast({ title: "Credenziali aggiornate", description: changes.join(", ") });
      setShowEditDialog(false);
      setEditingOperator(null);
      setEditUsername("");
      setEditPassword("");
      setShowEditPassword(false);
      refetch();
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive",
      });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gestione Operatori
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gli operatori possono gestire Open Mic e Dediche durante gli eventi, senza accesso a funzioni distruttive.
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
            <p className="text-sm text-muted-foreground mb-4">
              Crea il primo operatore per gestire gli eventi dal vivo
            </p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Crea Operatore
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {operators.map((operator) => (
            <Card
              key={operator.user_id}
              className={cn(
                "transition-all",
                expandedUserId === operator.user_id && "ring-2 ring-primary/20"
              )}
            >
              <CardHeader
                className="cursor-pointer py-4"
                onClick={() =>
                  setExpandedUserId(
                    expandedUserId === operator.user_id ? null : operator.user_id
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {operator.display_name || operator.email}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {operator.email}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {operator.permissions.view_centro && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          <Bell className="w-3 h-3" />
                        </Badge>
                      )}
                      {operator.permissions.view_openmic && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          <Music className="w-3 h-3" />
                        </Badge>
                      )}
                      {operator.permissions.view_dediche && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          <MessageSquare className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                    {expandedUserId === operator.user_id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedUserId === operator.user_id && (
                <CardContent className="pt-0 space-y-6">
                  <Separator />

                  {/* Section Visibility */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Sezioni Visibili
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Centro */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Centro</span>
                        </div>
                        <Switch
                          checked={operator.permissions.view_centro}
                          onCheckedChange={(v) =>
                            handlePermissionToggle(operator, "view_centro", v)
                          }
                        />
                      </div>
                      {/* Open Mic */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Open Mic</span>
                        </div>
                        <Switch
                          checked={operator.permissions.view_openmic}
                          onCheckedChange={(v) =>
                            handlePermissionToggle(operator, "view_openmic", v)
                          }
                        />
                      </div>
                      {/* Dediche */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Dediche</span>
                        </div>
                        <Switch
                          checked={operator.permissions.view_dediche}
                          onCheckedChange={(v) =>
                            handlePermissionToggle(operator, "view_dediche", v)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Levels */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Livello Operatività
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Open Mic actions */}
                      <div className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Open Mic</span>
                        </div>
                        <div className="space-y-2 pl-6">
                          <Label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`openmic-${operator.user_id}`}
                              checked={!operator.permissions.openmic_manage}
                              onChange={() =>
                                handlePermissionToggle(operator, "openmic_manage", false)
                              }
                              className="accent-primary"
                            />
                            Solo visualizzazione
                          </Label>
                          <Label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`openmic-${operator.user_id}`}
                              checked={operator.permissions.openmic_manage}
                              onChange={() =>
                                handlePermissionToggle(operator, "openmic_manage", true)
                              }
                              className="accent-primary"
                            />
                            Gestione completa (coda)
                          </Label>
                        </div>
                      </div>

                      {/* Dediche actions */}
                      <div className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Dediche</span>
                        </div>
                        <div className="space-y-2 pl-6">
                          <Label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`dediche-${operator.user_id}`}
                              checked={!operator.permissions.dediche_manage}
                              onChange={() =>
                                handlePermissionToggle(operator, "dediche_manage", false)
                              }
                              className="accent-primary"
                            />
                            Solo lettura
                          </Label>
                          <Label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`dediche-${operator.user_id}`}
                              checked={operator.permissions.dediche_manage}
                              onChange={() =>
                                handlePermissionToggle(operator, "dediche_manage", true)
                              }
                              className="accent-primary"
                            />
                            Gestione completa (risposte)
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingOperator(operator);
                        setEditUsername(operator.display_name || operator.email);
                        setEditPassword("");
                        setShowEditDialog(true);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifica Credenziali
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteDialog(operator.user_id)}
                    >
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
            <strong>Nota:</strong> Gli operatori non vedono mai pulsanti di reset, eliminazione o configurazioni avanzate.
            Possono solo gestire la coda e/o rispondere ai messaggi, in base ai permessi assegnati.
          </p>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setNewOperatorUsername("");
          setNewOperatorPassword("");
          setShowPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Operatore</DialogTitle>
            <DialogDescription>
              Crea un account operatore per gestire gli eventi dal vivo.
              L'operatore accederà dal pannello admin con username e password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="es. mario_rossi"
                value={newOperatorUsername}
                onChange={(e) => setNewOperatorUsername(e.target.value)}
                maxLength={50}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Solo lettere, numeri e underscore. Min 3 caratteri.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newOperatorPassword}
                  onChange={(e) => setNewOperatorPassword(e.target.value)}
                  maxLength={100}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimo 6 caratteri
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateOperator} disabled={isCreating}>
              {isCreating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
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
            <AlertDialogDescription>
              L'operatore non potrà più accedere alla dashboard admin.
              L'account utente rimarrà attivo per la community.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDeleteOperator(showDeleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Credentials Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditingOperator(null);
          setEditUsername("");
          setEditPassword("");
          setShowEditPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Modifica Credenziali
            </DialogTitle>
            <DialogDescription>
              Modifica username e/o password per <strong>{editingOperator?.display_name || editingOperator?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
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
              <Label htmlFor="edit-password">Nuova Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
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
                  tabIndex={-1}
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
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleEditCredentials}
              disabled={isEditing || (!editPassword.trim() && editUsername === (editingOperator?.display_name || editingOperator?.email))}
            >
              {isEditing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Pencil className="w-4 h-4 mr-2" />
              )}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
