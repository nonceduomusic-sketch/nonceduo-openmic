import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GroupJoinRequest {
  id: string;
  conversation_id: string;
  user_id: string | null;
  session_id: string | null;
  requester_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  conversation?: {
    name: string | null;
    section: string;
  };
}

export interface FriendshipAdmin {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  requester?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  addressee?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface AdminNotificationCounts {
  pendingJoinRequests: number;
  unreadDedicheMessages: number;
  unreadCommunityMessages: number;
  newReservations: number;
}

export const useAdminNotifications = () => {
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [friendships, setFriendships] = useState<FriendshipAdmin[]>([]);
  const [counts, setCounts] = useState<AdminNotificationCounts>({
    pendingJoinRequests: 0,
    unreadDedicheMessages: 0,
    unreadCommunityMessages: 0,
    newReservations: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchJoinRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          *,
          conversation:conversations(name, section)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJoinRequests((data || []) as GroupJoinRequest[]);
      setCounts(prev => ({ ...prev, pendingJoinRequests: (data || []).length }));
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  }, []);

  const fetchFriendships = useCallback(async () => {
    try {
      // Fetch all friendships with user profiles
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs
      const userIds = new Set<string>();
      (data || []).forEach(f => {
        userIds.add(f.requester_id);
        userIds.add(f.addressee_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enriched = (data || []).map(f => ({
        ...f,
        status: f.status as 'pending' | 'accepted' | 'rejected' | 'blocked',
        requester: profileMap.get(f.requester_id),
        addressee: profileMap.get(f.addressee_id),
      }));

      setFriendships(enriched as FriendshipAdmin[]);
    } catch (error) {
      console.error('Error fetching friendships:', error);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      // Get unread dediche messages count
      // NOTE: `conversations.is_read` is nullable in the schema.
      // Older rows (or some creation paths) may leave it NULL. Treat NULL as "unread".
      const { data: dedicheConvs } = await supabase
        .from('conversations')
        .select('id')
        .eq('section', 'dediche')
        .or('is_read.is.null,is_read.eq.false');
      
      // Get unread community messages count  
      const { data: communityConvs } = await supabase
        .from('conversations')
        .select('id')
        .eq('section', 'community')
        .or('is_read.is.null,is_read.eq.false');

      // Get today's reservations count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: reservationsCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setCounts(prev => ({
        ...prev,
        unreadDedicheMessages: (dedicheConvs || []).length,
        unreadCommunityMessages: (communityConvs || []).length,
        newReservations: reservationsCount || 0,
      }));
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchJoinRequests(), fetchFriendships(), fetchCounts()]);
      setLoading(false);
    };

    loadAll();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_join_requests' },
        () => fetchJoinRequests()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => fetchFriendships()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchCounts()
      )
      // Conversations don't necessarily emit an update on every new message,
      // so we also listen directly to message inserts/updates.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservations' },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJoinRequests, fetchFriendships, fetchCounts]);

  // Approve join request
  const approveJoinRequest = async (requestId: string): Promise<boolean> => {
    try {
      const request = joinRequests.find(r => r.id === requestId);
      if (!request) return false;

      const { data: { user } } = await supabase.auth.getUser();

      // Update request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add user as participant
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([{
          conversation_id: request.conversation_id,
          participant_name: request.requester_name,
          session_id: request.session_id || request.user_id,
          user_id: request.user_id,
        }]);

      if (participantError) throw participantError;

      toast.success('Richiesta approvata!');
      return true;
    } catch (error) {
      console.error('Error approving join request:', error);
      toast.error('Errore nell\'approvazione');
      return false;
    }
  };

  // Reject join request
  const rejectJoinRequest = async (requestId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('group_join_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Richiesta rifiutata');
      return true;
    } catch (error) {
      console.error('Error rejecting join request:', error);
      toast.error('Errore nel rifiuto');
      return false;
    }
  };

  // Create friendship between two users (admin action)
  const createFriendship = async (userId1: string, userId2: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert([{
          requester_id: userId1,
          addressee_id: userId2,
          status: 'accepted', // Admin-created friendships are auto-accepted
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Amicizia già esistente');
          return false;
        }
        throw error;
      }

      toast.success('Amicizia creata!');
      await fetchFriendships();
      return true;
    } catch (error) {
      console.error('Error creating friendship:', error);
      toast.error('Errore nella creazione');
      return false;
    }
  };

  // Remove friendship (admin action)
  const removeFriendship = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Amicizia rimossa');
      await fetchFriendships();
      return true;
    } catch (error) {
      console.error('Error removing friendship:', error);
      toast.error('Errore nella rimozione');
      return false;
    }
  };

  // Update friendship status (admin action)
  const updateFriendshipStatus = async (
    friendshipId: string, 
    status: 'pending' | 'accepted' | 'rejected' | 'blocked'
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Stato aggiornato');
      await fetchFriendships();
      return true;
    } catch (error) {
      console.error('Error updating friendship:', error);
      toast.error('Errore nell\'aggiornamento');
      return false;
    }
  };

  return {
    joinRequests,
    friendships,
    counts,
    loading,
    approveJoinRequest,
    rejectJoinRequest,
    createFriendship,
    removeFriendship,
    updateFriendshipStatus,
    refetch: async () => {
      await Promise.all([fetchJoinRequests(), fetchFriendships(), fetchCounts()]);
    },
  };
};
