import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
  RefreshCw,
  UserX,
  Unlock,
  Clock,
  AlertTriangle,
  Search,
  Ban,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface BlockedUser {
  id: string;
  session_id: string;
  reason: string | null;
  blocked_at: string | null;
  expires_at: string | null;
  blocked_by: string | null;
}

export const AdminBlockedUsersTab: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchBlockedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-chat', {
        body: { action: 'getBlockedUsers' },
      });

      if (error) throw error;
      setBlockedUsers(data.blockedUsers || []);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare gli utenti bloccati',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('blocked-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_users',
        },
        () => {
          fetchBlockedUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBlockedUsers]);

  const handleUnblock = async (sessionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-chat', {
        body: { action: 'unblockUser', sessionId },
      });

      if (error) throw error;

      toast({
        title: 'Utente sbloccato',
        description: 'L\'utente può ora inviare messaggi',
      });
      
      fetchBlockedUsers();
    } catch (err) {
      console.error('Error unblocking user:', err);
      toast({
        title: 'Errore',
        description: 'Impossibile sbloccare l\'utente',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = blockedUsers.filter((user) =>
    user.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isPermanent = (expiresAt: string | null) => {
    return expiresAt === null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per ID sessione o motivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="glass-card border-destructive/30">
          <CardContent className="p-4 text-center">
            <Ban className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{blockedUsers.length}</p>
            <p className="text-xs text-muted-foreground">Totale Bloccati</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-amber-500/30">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold text-amber-500">
              {blockedUsers.filter(u => !isPermanent(u.expires_at) && !isExpired(u.expires_at)).length}
            </p>
            <p className="text-xs text-muted-foreground">Temporanei</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-red-700/30">
          <CardContent className="p-4 text-center">
            <UserX className="w-6 h-6 mx-auto mb-2 text-red-700" />
            <p className="text-2xl font-bold text-red-700">
              {blockedUsers.filter(u => isPermanent(u.expires_at)).length}
            </p>
            <p className="text-xs text-muted-foreground">Permanenti</p>
          </CardContent>
        </Card>
      </div>

      {/* Blocked Users List */}
      {filteredUsers.length === 0 ? (
        <Card className="glass-card border-border">
          <CardContent className="p-8 text-center">
            <Unlock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Nessun utente trovato' : 'Nessun utente bloccato'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card
              key={user.id}
              className={`glass-card transition-all ${
                isExpired(user.expires_at)
                  ? 'border-muted opacity-60'
                  : isPermanent(user.expires_at)
                  ? 'border-red-700/50'
                  : 'border-amber-500/50'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                      <UserX className="w-4 h-4 text-destructive" />
                      <span className="truncate max-w-[200px]">{user.session_id}</span>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpired(user.expires_at) ? (
                      <Badge variant="outline" className="text-muted-foreground border-muted">
                        Scaduto
                      </Badge>
                    ) : isPermanent(user.expires_at) ? (
                      <Badge variant="destructive">Permanente</Badge>
                    ) : (
                      <Badge className="bg-amber-500 text-black">Temporaneo</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  {user.reason && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{user.reason}</span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {user.blocked_at && (
                      <span>
                        Bloccato: {format(new Date(user.blocked_at), 'dd MMM yyyy HH:mm', { locale: it })}
                      </span>
                    )}
                    {user.expires_at && (
                      <span>
                        Scade: {format(new Date(user.expires_at), 'dd MMM yyyy HH:mm', { locale: it })}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Sblocca
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sblocca Utente</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler sbloccare questo utente? Potrà nuovamente inviare messaggi.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleUnblock(user.session_id)}
                            className="bg-primary text-primary-foreground"
                          >
                            Conferma Sblocco
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
