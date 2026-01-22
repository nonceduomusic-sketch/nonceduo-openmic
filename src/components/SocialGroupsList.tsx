import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Globe, Lock, Users, MessageCircle, RefreshCw, Search, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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
  participants?: { id: string; session_id: string; participant_name: string; user_id?: string }[];
}

interface SocialGroupsListProps {
  userId?: string;
  userSessionId?: string;
}

export const SocialGroupsList: React.FC<SocialGroupsListProps> = ({ 
  userId,
  userSessionId 
}) => {
  const [joinedGroups, setJoinedGroups] = useState<Conversation[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'joined' | 'available'>('joined');
  
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
          participants:conversation_participants(id, session_id, participant_name, user_id)
        `)
        .eq('section', 'community')
        .eq('is_group', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const allGroups = data || [];
      
      // Separate groups into joined and available
      const joined: Conversation[] = [];
      const available: Conversation[] = [];

      allGroups.forEach((conv: Conversation) => {
        // Check if user is participant (by session_id or user_id)
        const isParticipant = conv.participants?.some(p => 
          (userSessionId && p.session_id === userSessionId) ||
          (userId && p.user_id === userId)
        );
        
        if (isParticipant) {
          joined.push(conv);
        } else {
          // Check if group is accessible
          if (conv.is_public) {
            available.push(conv);
          } else if (userSessionId && conv.allowed_participants?.includes(userSessionId)) {
            available.push(conv);
          } else if (userId && conv.allowed_participants?.includes(userId)) {
            available.push(conv);
          }
        }
      });

      setJoinedGroups(joined);
      setAvailableGroups(available);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Errore nel caricamento dei gruppi');
    } finally {
      setLoading(false);
    }
  }, [userId, userSessionId]);

  useEffect(() => {
    fetchGroups();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('social-groups-changes')
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
      // Get user name from localStorage or profile
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
          user_id: userId,
          password: groupPassword,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      toast.success('Sei entrato nel gruppo!');
      setActiveTab('joined');
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

  const filteredJoined = joinedGroups.filter(g => 
    g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailable = availableGroups.filter(g => 
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-secondary" />
              I Miei Gruppi
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchGroups}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'joined' | 'available')}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="joined" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Iscritto ({joinedGroups.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="gap-2">
                <Globe className="w-4 h-4" />
                Disponibili ({availableGroups.length})
              </TabsTrigger>
            </TabsList>

            {/* Joined Groups */}
            <TabsContent value="joined" className="mt-4">
              {filteredJoined.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Nessun gruppo trovato' : 'Non sei ancora iscritto a nessun gruppo'}
                  </p>
                  {!searchQuery && availableGroups.length > 0 && (
                    <Button 
                      variant="link" 
                      onClick={() => setActiveTab('available')}
                      className="mt-2"
                    >
                      Esplora gruppi disponibili
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredJoined.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{group.name}</span>
                            {group.password_hash && (
                              <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            )}
                            {group.is_public && (
                              <Globe className="w-3 h-3 text-secondary flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Iscritto
                            </Badge>
                            <span>{group.participants?.length || 0} membri</span>
                          </div>
                        </div>
                        
                        <Link to={`/messaggi?group=${group.id}`}>
                          <Button size="sm" variant="outline" className="gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Apri
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Available Groups */}
            <TabsContent value="available" className="mt-4">
              {filteredAvailable.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Nessun gruppo trovato' : 'Nessun gruppo pubblico disponibile'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredAvailable.map((group) => {
                      const isPrivateInvite = !group.is_public;
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
            </TabsContent>
          </Tabs>
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
