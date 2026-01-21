import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, MessageCircle, UserCheck, Clock, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUserSearch, SearchUser } from '@/hooks/useUserSearch';
import { useFriendships } from '@/hooks/useFriendships';

interface UserSearchProps {
  currentUserId?: string;
  onSelectUser?: (user: SearchUser) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ currentUserId, onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { results, loading, searchUsers, clearResults } = useUserSearch(currentUserId);
  const { getFriendshipStatus, sendFriendRequest, sendMessageRequest } = useFriendships(currentUserId);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchUsers(query);
        setIsOpen(true);
      }, 300);
    } else {
      clearResults();
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchUsers, clearResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    clearResults();
    setIsOpen(false);
  };

  const getStatusIcon = (userId: string) => {
    const status = getFriendshipStatus(userId);
    switch (status) {
      case 'friends':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'pending_sent':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'pending_received':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const handleAction = async (user: SearchUser, action: 'friend' | 'message') => {
    if (action === 'friend') {
      await sendFriendRequest(user.user_id);
    } else {
      await sendMessageRequest(user.user_id);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca utenti..."
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full glass-card p-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">
              Nessun utente trovato
            </p>
          ) : (
            <div className="space-y-1">
              {results.map((user) => {
                const status = getFriendshipStatus(user.user_id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <button
                      className="flex items-center gap-3 flex-1 text-left"
                      onClick={() => onSelectUser?.(user)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center relative">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="font-bold">
                            {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                        {user.is_online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {user.display_name || user.username || 'Utente'}
                          </p>
                          {getStatusIcon(user.user_id)}
                        </div>
                        {user.username && (
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        )}
                      </div>
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {status === 'none' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleAction(user, 'friend')}
                            title="Aggiungi amico"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleAction(user, 'message')}
                            title="Invia richiesta messaggio"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {status === 'friends' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onSelectUser?.(user)}
                          title="Invia messaggio"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
