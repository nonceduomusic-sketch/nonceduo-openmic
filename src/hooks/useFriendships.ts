import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  other_user?: {
    id: string;
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface MessageRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  other_user?: {
    id: string;
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export const useFriendships = (userId?: string) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [pendingSent, setPendingSent] = useState<Friendship[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendships = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all friendships
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (error) throw error;

      // Get all other user IDs
      const otherUserIds = (friendships || []).map(f => 
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );

      // Fetch profiles for other users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, username, avatar_url')
        .in('user_id', otherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Categorize friendships
      const enriched = (friendships || []).map(f => ({
        ...f,
        other_user: profileMap.get(f.requester_id === userId ? f.addressee_id : f.requester_id),
      }));

      setFriends(enriched.filter(f => f.status === 'accepted') as Friendship[]);
      setPendingReceived(enriched.filter(f => f.status === 'pending' && f.addressee_id === userId) as Friendship[]);
      setPendingSent(enriched.filter(f => f.status === 'pending' && f.requester_id === userId) as Friendship[]);

      // Fetch message requests
      const { data: requests, error: reqError } = await supabase
        .from('message_requests')
        .select('*')
        .eq('recipient_id', userId)
        .eq('status', 'pending');

      if (!reqError && requests) {
        const senderIds = requests.map(r => r.sender_id);
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, username, avatar_url')
          .in('user_id', senderIds);

        const senderMap = new Map(senderProfiles?.map(p => [p.user_id, p]) || []);
        
        setMessageRequests(requests.map(r => ({
          ...r,
          other_user: senderMap.get(r.sender_id),
        })) as MessageRequest[]);
      }
    } catch (error) {
      console.error('Error fetching friendships:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFriendships();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('friendships-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => fetchFriendships()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_requests' },
        () => fetchFriendships()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFriendships]);

  const sendFriendRequest = async (targetUserId: string): Promise<boolean> => {
    if (!userId) {
      toast.error('Devi essere autenticato');
      return false;
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .insert([{ requester_id: userId, addressee_id: targetUserId }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Richiesta già inviata');
          return false;
        }
        throw error;
      }

      toast.success('Richiesta di amicizia inviata!');
      return true;
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error('Errore nell\'invio della richiesta');
      return false;
    }
  };

  const respondToFriendRequest = async (friendshipId: string, accept: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success(accept ? 'Amicizia accettata!' : 'Richiesta rifiutata');
      return true;
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      toast.error('Errore nella risposta');
      return false;
    }
  };

  const removeFriend = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Amicizia rimossa');
      return true;
    } catch (error: any) {
      console.error('Error removing friend:', error);
      toast.error('Errore nella rimozione');
      return false;
    }
  };

  const sendMessageRequest = async (targetUserId: string): Promise<boolean> => {
    if (!userId) {
      toast.error('Devi essere autenticato');
      return false;
    }

    try {
      const { error } = await supabase
        .from('message_requests')
        .insert([{ sender_id: userId, recipient_id: targetUserId }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Richiesta già inviata');
          return false;
        }
        throw error;
      }

      toast.success('Richiesta messaggio inviata!');
      return true;
    } catch (error: any) {
      console.error('Error sending message request:', error);
      toast.error('Errore nell\'invio della richiesta');
      return false;
    }
  };

  const respondToMessageRequest = async (requestId: string, accept: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('message_requests')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success(accept ? 'Richiesta accettata!' : 'Richiesta rifiutata');
      return true;
    } catch (error: any) {
      console.error('Error responding to message request:', error);
      toast.error('Errore nella risposta');
      return false;
    }
  };

  const getFriendshipStatus = (targetUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'friends' => {
    if (friends.some(f => f.other_user?.user_id === targetUserId)) return 'friends';
    if (pendingSent.some(f => f.addressee_id === targetUserId)) return 'pending_sent';
    if (pendingReceived.some(f => f.requester_id === targetUserId)) return 'pending_received';
    return 'none';
  };

  return {
    friends,
    pendingReceived,
    pendingSent,
    messageRequests,
    loading,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    sendMessageRequest,
    respondToMessageRequest,
    getFriendshipStatus,
    refetch: fetchFriendships,
  };
};
