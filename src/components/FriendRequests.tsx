import React from 'react';
import { UserPlus, UserCheck, UserX, MessageCircle, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useFriendships, Friendship, MessageRequest } from '@/hooks/useFriendships';

interface FriendRequestsProps {
  userId?: string;
}

export const FriendRequests: React.FC<FriendRequestsProps> = ({ userId }) => {
  const {
    friends,
    pendingReceived,
    pendingSent,
    messageRequests,
    loading,
    respondToFriendRequest,
    respondToMessageRequest,
    removeFriend,
  } = useFriendships(userId);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAnyContent = friends.length > 0 || pendingReceived.length > 0 || pendingSent.length > 0 || messageRequests.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="text-center py-8">
        <UserPlus className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Nessuna richiesta o amicizia</p>
        <p className="text-sm text-muted-foreground">Cerca utenti per iniziare a connetterti!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Incoming Friend Requests */}
      {pendingReceived.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Richieste di amicizia ({pendingReceived.length})
          </h3>
          <div className="space-y-2">
            {pendingReceived.map((request) => (
              <div key={request.id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {request.other_user?.avatar_url ? (
                      <img
                        src={request.other_user.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="font-bold">
                        {(request.other_user?.display_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{request.other_user?.display_name || 'Utente'}</p>
                    {request.other_user?.username && (
                      <p className="text-xs text-muted-foreground">@{request.other_user.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    onClick={() => respondToFriendRequest(request.id, true)}
                    title="Accetta"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => respondToFriendRequest(request.id, false)}
                    title="Rifiuta"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Requests */}
      {messageRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Richieste messaggio ({messageRequests.length})
          </h3>
          <div className="space-y-2">
            {messageRequests.map((request) => (
              <div key={request.id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium">{request.other_user?.display_name || 'Utente'}</p>
                    <p className="text-xs text-muted-foreground">vuole inviarti un messaggio</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    onClick={() => respondToMessageRequest(request.id, true)}
                    title="Accetta"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => respondToMessageRequest(request.id, false)}
                    title="Rifiuta"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests (pending) */}
      {pendingSent.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Richieste inviate ({pendingSent.length})
          </h3>
          <div className="space-y-2">
            {pendingSent.map((request) => (
              <div key={request.id} className="glass-card p-3 flex items-center justify-between opacity-70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {request.other_user?.avatar_url ? (
                      <img
                        src={request.other_user.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-muted-foreground">
                        {(request.other_user?.display_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{request.other_user?.display_name || 'Utente'}</p>
                    <Badge variant="secondary" className="text-xs">In attesa</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      {friends.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Amici ({friends.length})
          </h3>
          <div className="space-y-2">
            {friends.map((friendship) => (
              <div key={friendship.id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    {friendship.other_user?.avatar_url ? (
                      <img
                        src={friendship.other_user.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-green-500">
                        {(friendship.other_user?.display_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{friendship.other_user?.display_name || 'Utente'}</p>
                    {friendship.other_user?.username && (
                      <p className="text-xs text-muted-foreground">@{friendship.other_user.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Invia messaggio"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => removeFriend(friendship.id)}
                    title="Rimuovi amico"
                  >
                    <UserX className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
