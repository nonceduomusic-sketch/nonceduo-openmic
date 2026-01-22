import React, { useState } from 'react';
import {
  Bell,
  Users,
  MessageCircle,
  Music,
  Check,
  X,
  UserPlus,
  Link2,
  Search,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAdminNotifications, FriendshipAdmin } from '@/hooks/useAdminNotifications';
import { useUserSearch } from '@/hooks/useUserSearch';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

export const AdminNotificationsTab: React.FC = () => {
  const {
    joinRequests,
    friendships,
    counts,
    loading,
    approveJoinRequest,
    rejectJoinRequest,
    createFriendship,
    removeFriendship,
    updateFriendshipStatus,
    refetch,
  } = useAdminNotifications();

  const { searchUsers, results: userResults, loading: searchLoading } = useUserSearch();

  const [showCreateFriendship, setShowCreateFriendship] = useState(false);
  const [selectedUser1, setSelectedUser1] = useState<string | null>(null);
  const [selectedUser2, setSelectedUser2] = useState<string | null>(null);
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [friendshipFilter, setFriendshipFilter] = useState<'all' | 'pending' | 'accepted' | 'blocked'>('all');

  // Sections state
  const [openSections, setOpenSections] = useState({
    joinRequests: true,
    friendships: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSearch1 = (query: string) => {
    setSearchQuery1(query);
    if (query.length >= 2) {
      searchUsers(query);
    }
  };

  const handleSearch2 = (query: string) => {
    setSearchQuery2(query);
    if (query.length >= 2) {
      searchUsers(query);
    }
  };

  const handleCreateFriendship = async () => {
    if (!selectedUser1 || !selectedUser2) return;
    
    const success = await createFriendship(selectedUser1, selectedUser2);
    if (success) {
      setShowCreateFriendship(false);
      setSelectedUser1(null);
      setSelectedUser2(null);
      setSearchQuery1('');
      setSearchQuery2('');
    }
  };

  const filteredFriendships = friendships.filter(f => {
    if (friendshipFilter === 'all') return true;
    return f.status === friendshipFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning">In attesa</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-secondary border-secondary">Amici</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-destructive border-destructive">Rifiutata</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Bloccata</Badge>;
      default:
        return null;
    }
  };

  const getSectionBadge = (section?: string) => {
    if (!section) return null;
    return section === 'dediche' 
      ? <Badge className="bg-primary/20 text-primary">Dediche</Badge>
      : <Badge className="bg-secondary/20 text-secondary">Community</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-primary/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{counts.pendingJoinRequests}</div>
            <div className="text-xs text-muted-foreground mt-1">Richieste Accesso</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-secondary/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-secondary">{counts.unreadDedicheMessages}</div>
            <div className="text-xs text-muted-foreground mt-1">Msg Dediche</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-accent/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-accent">{counts.unreadCommunityMessages}</div>
            <div className="text-xs text-muted-foreground mt-1">Msg Community</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-warning/30">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-warning">{counts.newReservations}</div>
            <div className="text-xs text-muted-foreground mt-1">Prenotazioni Oggi</div>
          </CardContent>
        </Card>
      </div>

      {/* Join Requests Section */}
      <Collapsible open={openSections.joinRequests} onOpenChange={() => toggleSection('joinRequests')}>
        <Card className="glass-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Richieste Accesso Gruppi
                  {joinRequests.length > 0 && (
                    <Badge variant="destructive">{joinRequests.length}</Badge>
                  )}
                </div>
                {openSections.joinRequests ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {joinRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nessuna richiesta in attesa
                </p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {joinRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border min-w-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{request.requester_name}</span>
                            {getSectionBadge(request.conversation?.section)}
                          </div>
                          <p className="text-sm text-muted-foreground break-words leading-snug">
                            Vuole entrare in: <strong>{request.conversation?.name || 'Gruppo'}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { 
                              addSuffix: true, 
                              locale: it 
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground flex-1 sm:flex-none"
                            onClick={() => approveJoinRequest(request.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1 sm:flex-none"
                            onClick={() => rejectJoinRequest(request.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Friendships Management Section */}
      <Collapsible open={openSections.friendships} onOpenChange={() => toggleSection('friendships')}>
        <Card className="glass-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-secondary" />
                  Gestione Amicizie
                </div>
                {openSections.friendships ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Actions */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-2">
                  <Select value={friendshipFilter} onValueChange={(v) => setFriendshipFilter(v as any)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filtra" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      <SelectItem value="pending">In attesa</SelectItem>
                      <SelectItem value="accepted">Amici</SelectItem>
                      <SelectItem value="blocked">Bloccate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowCreateFriendship(true)}
                  className="bg-secondary hover:bg-secondary/90"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crea Amicizia
                </Button>
              </div>

              {/* Friendships List */}
              {filteredFriendships.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nessuna amicizia trovata
                </p>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {filteredFriendships.map((friendship) => (
                      <div
                        key={friendship.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border min-w-0"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
                          {/* User 1 */}
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={friendship.requester?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {friendship.requester?.display_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">
                              {friendship.requester?.display_name || friendship.requester?.username || 'Utente'}
                            </span>
                          </div>

                          {/* Connector */}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Link2 className="w-4 h-4" />
                          </div>

                          {/* User 2 */}
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={friendship.addressee?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {friendship.addressee?.display_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">
                              {friendship.addressee?.display_name || friendship.addressee?.username || 'Utente'}
                            </span>
                          </div>

                          {getStatusBadge(friendship.status)}
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                          {friendship.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground flex-1 sm:flex-none"
                              onClick={() => updateFriendshipStatus(friendship.id, 'accepted')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1 sm:flex-none"
                            onClick={() => removeFriendship(friendship.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create Friendship Dialog */}
      <Dialog open={showCreateFriendship} onOpenChange={setShowCreateFriendship}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-secondary" />
              Crea Amicizia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Utente 1</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca utente..."
                  value={searchQuery1}
                  onChange={(e) => handleSearch1(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchQuery1.length >= 2 && userResults.length > 0 && !selectedUser1 && (
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                  {userResults.map(user => (
                    <button
                      key={user.id}
                      className="w-full text-left p-2 rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => {
                        setSelectedUser1(user.user_id);
                        setSearchQuery1(user.display_name || user.username || 'Utente');
                      }}
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(user.display_name || user.username)?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.display_name || user.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Utente 2</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca utente..."
                  value={searchQuery2}
                  onChange={(e) => handleSearch2(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchQuery2.length >= 2 && userResults.length > 0 && !selectedUser2 && (
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                  {userResults.filter(u => u.user_id !== selectedUser1).map(user => (
                    <button
                      key={user.id}
                      className="w-full text-left p-2 rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => {
                        setSelectedUser2(user.user_id);
                        setSearchQuery2(user.display_name || user.username || 'Utente');
                      }}
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(user.display_name || user.username)?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.display_name || user.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFriendship(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleCreateFriendship}
              disabled={!selectedUser1 || !selectedUser2}
              className="bg-secondary hover:bg-secondary/90"
            >
              Crea Amicizia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
