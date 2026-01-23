import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormatPreferences } from './useFormatPreferences';

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

interface UseAdminNotificationsOptions {
  formatPreferences?: FormatPreferences;
}

export const useAdminNotifications = (options?: UseAdminNotificationsOptions) => {
  const { formatPreferences } = options || {};
  
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [counts, setCounts] = useState<AdminNotificationCounts>({
    pendingJoinRequests: 0,
    unreadDedicheMessages: 0,
    unreadCommunityMessages: 0,
    newReservations: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Track current channel for cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchJoinRequests = useCallback(async () => {
    // Only fetch if community is enabled
    if (formatPreferences && !formatPreferences.community) {
      setCounts(prev => ({ ...prev, pendingJoinRequests: 0 }));
      setJoinRequests([]);
      return;
    }
    
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
  }, [formatPreferences]);

  const fetchCounts = useCallback(async () => {
    try {
      // Dediche count - count conversations with unread user messages (not admin messages)
      // We count distinct conversations that have messages from users that are not read
      let dedicheCount = 0;
      if (!formatPreferences || formatPreferences.dediche) {
        // Get dediche conversations that have unread messages from users
        const { data: unreadDediche } = await supabase
          .from('chat_messages')
          .select('conversation_id, conversations!inner(section)')
          .eq('sender_type', 'user')
          .is('read_at', null)
          .eq('conversations.section', 'dediche');
        
        // Count unique conversations
        const uniqueDedicheConvs = new Set((unreadDediche || []).map(m => m.conversation_id));
        dedicheCount = uniqueDedicheConvs.size;
      }
      
      // Community count - for public groups, we don't track unread messages for admin
      // since these are group chats, not admin-user conversations
      // The admin only needs to know about join requests, which are counted separately
      const communityCount = 0;

      // Open Mic reservations - only if enabled
      let reservationsCount = 0;
      if (!formatPreferences || formatPreferences.openmic) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_progress')
          .gte('created_at', today.toISOString());
        reservationsCount = count || 0;
      }

      setCounts(prev => ({
        ...prev,
        unreadDedicheMessages: dedicheCount,
        unreadCommunityMessages: communityCount,
        newReservations: reservationsCount,
      }));
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }, [formatPreferences]);

  // Setup realtime subscriptions based on active formats
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchJoinRequests(), fetchCounts()]);
      setLoading(false);
    };

    loadAll();

    // Clean up previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Build channel with only active format subscriptions
    const channel = supabase.channel('admin-notifications-dynamic');
    let hasSubscriptions = false;

    // Community subscriptions
    if (!formatPreferences || formatPreferences.community) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_join_requests' },
        () => {
          console.log('[AdminNotifications] group_join_requests changed');
          fetchJoinRequests();
        }
      );
      hasSubscriptions = true;
    }

    // Conversations (dediche + community) - subscribe if either is active
    if (!formatPreferences || formatPreferences.dediche || formatPreferences.community) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          console.log('[AdminNotifications] conversations changed');
          fetchCounts();
        }
      );
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          console.log('[AdminNotifications] chat_messages changed');
          fetchCounts();
        }
      );
      hasSubscriptions = true;
    }

    // Reservations (openmic)
    if (!formatPreferences || formatPreferences.openmic) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          console.log('[AdminNotifications] reservations changed');
          fetchCounts();
        }
      );
      hasSubscriptions = true;
    }

    // Only subscribe if we have at least one active subscription
    if (hasSubscriptions) {
      channel.subscribe((status) => {
        console.log('[AdminNotifications] Realtime subscription status:', status);
      });
      channelRef.current = channel;
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchJoinRequests, fetchCounts, formatPreferences]);

  // Approve join request
  const approveJoinRequest = async (requestId: string): Promise<boolean> => {
    try {
      const request = joinRequests.find(r => r.id === requestId);
      if (!request) return false;

      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

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

  // Mark all conversations as read for a specific section
  const markSectionAsRead = async (section: 'dediche' | 'community'): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_read: true })
        .eq('section', section);

      if (error) throw error;
      
      await fetchCounts();
      toast.success(`Tutti i messaggi ${section === 'dediche' ? 'Dediche' : 'Community'} segnati come letti`);
      return true;
    } catch (error) {
      console.error('Error marking section as read:', error);
      toast.error('Errore nel segna come letto');
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async (): Promise<boolean> => {
    try {
      // Mark all conversations as read
      const { error: convError } = await supabase
        .from('conversations')
        .update({ is_read: true })
        .or('is_read.is.null,is_read.eq.false');

      if (convError) throw convError;

      await fetchCounts();
      toast.success('Tutte le notifiche segnate come lette');
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Errore nel segna tutto come letto');
      return false;
    }
  };

  return {
    joinRequests,
    counts,
    loading,
    approveJoinRequest,
    rejectJoinRequest,
    markSectionAsRead,
    markAllAsRead,
    refetch: async () => {
      await Promise.all([fetchJoinRequests(), fetchCounts()]);
    },
  };
};
