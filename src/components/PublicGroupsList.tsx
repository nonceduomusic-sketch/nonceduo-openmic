import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Globe, Lock, Users, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  is_public?: boolean;
  allowed_participants?: string[];
  password_hash?: string | null;
  password_hint?: string | null;
  created_at: string;
  updated_at: string;
  participants?: { id: string; session_id: string; participant_name: string }[];
}

interface PublicGroupsListProps {
  userSessionId?: string;
  onJoinGroup?: (conversationId: string) => void;
}

export const PublicGroupsList: React.FC<PublicGroupsListProps> = ({ 
  userSessionId,
  onJoinGroup 
}) => {
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  
  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Conversation | null>(null);
  const [password, setPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(id, session_id, participant_name)
        `)
        .eq('is_group', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Filter to show:
      // 1. Public groups where user is not already a participant
      // 2. Private groups where user is in allowed_participants but not yet a participant
      const availableGroups = (data || []).filter((conv: Conversation) => {
        const isParticipant = userSessionId && conv.participants?.some(p => p.session_id === userSessionId);
        if (isParticipant) return false;
        
        if (conv.is_public) return true;
        
        if (userSessionId && conv.allowed_participants && conv.allowed_participants.length > 0) {
          return conv.allowed_participants.includes(userSessionId);
        }
        
        return false;
      });

      setGroups(availableGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Errore nel caricamento dei gruppi');
    } finally {
      setLoading(false);
    }
  }, [userSessionId]);

  useEffect(() => {
    fetchGroups();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('public-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchGroups)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants' }, fetchGroups)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGroups]);

  const handleJoinGroup = async (group: Conversation) => {
    if (!userSessionId) {
      toast.error('Sessione non valida');
      return;
    }

    // If group has password, show password dialog
    if (group.password_hash) {
      setPasswordTarget(group);
      setPassword('');
      setShowPasswordDialog(true);
      return;
    }

    // Join directly
    await joinGroup(group.id);
  };

  const joinGroup = async (groupId: string, groupPassword?: string) => {
    if (!userSessionId) return;

    setJoiningGroupId(groupId);
    try {
      // Get user name from localStorage
      let userName = 'Utente';
      try {
        userName = localStorage.getItem('user_name') || 'Utente';
      } catch {}

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: 'joinPublicGroup',
          conversation_id: groupId,
          participant_name: userName,
          session_id: userSessionId,
          password: groupPassword,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      toast.success('Sei entrato nel gruppo!');
      onJoinGroup?.(groupId);
      fetchGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore';
      if (errorMessage.includes('password') || errorMessage.includes('Password')) {
        toast.error('Password errata');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordTarget) return;
    
    setIsSubmittingPassword(true);
    try {
      await joinGroup(passwordTarget.id, password);
      setShowPasswordDialog(false);
      setPasswordTarget(null);
      setPassword('');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-secondary" />
            Gruppi Disponibili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca gruppi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Nessun gruppo trovato' : 'Nessun gruppo disponibile'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredGroups.map((group) => {
                  const isPrivateInvite = !group.is_public && group.allowed_participants?.includes(userSessionId || '');
                  const isJoining = joiningGroupId === group.id;
                  
                  return (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-secondary/50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPrivateInvite ? 'bg-primary/20' : 'bg-secondary/20'
                      }`}>
                        {isPrivateInvite ? (
                          <MessageCircle className="w-5 h-5 text-primary" />
                        ) : (
                          <Globe className="w-5 h-5 text-secondary" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{group.name}</span>
                          {group.password_hash && (
                            <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {isPrivateInvite && (
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              Invitato
                            </Badge>
                          )}
                          <span>{group.participants?.length || 0} membri</span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant={isPrivateInvite ? "default" : "outline"}
                        className={isPrivateInvite ? "neon-button-pink" : "border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"}
                        disabled={isJoining}
                        onClick={() => handleJoinGroup(group)}
                      >
                        {isJoining ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Unisciti'
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-secondary" />
              Inserisci Password
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Il gruppo <strong>{passwordTarget?.name}</strong> richiede una password per entrare.
            </p>
            
            {passwordTarget?.password_hint && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 Suggerimento: {passwordTarget.password_hint}
              </p>
            )}
            
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              autoFocus
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false);
              setPasswordTarget(null);
              setPassword('');
            }}>
              Annulla
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={!password.trim() || isSubmittingPassword}
              className="neon-button-cyan"
            >
              {isSubmittingPassword ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Entra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
