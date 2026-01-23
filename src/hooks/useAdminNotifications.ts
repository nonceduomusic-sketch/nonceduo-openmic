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

export interface AdminNotificationCounts {
  pendingJoinRequests: number;
  unreadDedicheMessages: number;
  unreadCommunityMessages: number;
  newReservations: number;
}

export const useAdminNotifications = () => {
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
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
      await Promise.all([fetchJoinRequests(), fetchCounts()]);
      setLoading(false);
    };

    loadAll();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_join_requests' },
        () => {
          console.log('[AdminNotifications] group_join_requests changed');
          fetchJoinRequests();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          console.log('[AdminNotifications] conversations changed - refetching counts');
          fetchCounts();
        }
      )
      // Listen to message inserts/updates for immediate badge updates
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          console.log('[AdminNotifications] chat_messages changed - refetching counts');
          fetchCounts();
        }
      )
      // Reservations: INSERT, UPDATE (for status changes), and DELETE
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          console.log('[AdminNotifications] reservations changed - refetching counts');
          fetchCounts();
        }
      )
      .subscribe((status) => {
        console.log('[AdminNotifications] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJoinRequests, fetchCounts]);

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

  return {
    joinRequests,
    counts,
    loading,
    approveJoinRequest,
    rejectJoinRequest,
    refetch: async () => {
      await Promise.all([fetchJoinRequests(), fetchCounts()]);
    },
  };
};
