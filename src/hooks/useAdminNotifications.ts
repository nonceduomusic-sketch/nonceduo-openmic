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
  unreadAssistantMessages: number;
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
    unreadAssistantMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Track current channel for cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Track last seen assistant message timestamp (more reliable than id since is_read can be set immediately)
  const lastAssistantMsgTimeRef = useRef<string | null>(null);

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

      // Assistant unread messages count
      // NOTE: We count conversations with unread user messages OR active conversations with recent messages
      // This ensures the badge shows even if messages were marked read immediately by the widget
      let assistantCount = 0;
      
      // Count unique conversations with unread user messages
      const { data: unreadAssistant } = await supabase
        .from('assistant_messages')
        .select('conversation_id')
        .eq('sender_type', 'user')
        .eq('is_read', false);
      
      const uniqueAssistantConvs = new Set((unreadAssistant || []).map(m => m.conversation_id));
      assistantCount = uniqueAssistantConvs.size;
      
      // If no unread messages, also count active conversations that have user messages
      // This handles the case where messages are marked read immediately
      if (assistantCount === 0) {
        const { data: activeConvs } = await supabase
          .from('assistant_conversations')
          .select('id')
          .eq('status', 'active');
          
        assistantCount = activeConvs?.length || 0;
      }

      setCounts(prev => ({
        ...prev,
        unreadDedicheMessages: dedicheCount,
        unreadCommunityMessages: communityCount,
        newReservations: reservationsCount,
        unreadAssistantMessages: assistantCount,
      }));
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }, [formatPreferences]);

  // Prime last-seen assistant message timestamp so we don't toast old messages on load
  const primeAssistantLastSeen = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('assistant_messages')
        .select('created_at')
        .eq('sender_type', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.created_at) {
        lastAssistantMsgTimeRef.current = data.created_at;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[AdminNotifications] primeAssistantLastSeen failed:', err);
    }
  }, []);

  // Setup realtime subscriptions based on active formats
  // Android WebSocket connections can be unreliable, so we use polling as backup
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchJoinRequests(), fetchCounts()]);
      await primeAssistantLastSeen();
      setLoading(false);
    };

    loadAll();

    // Clean up previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Build unique channel name to avoid conflicts
    const channelName = `admin-notifications-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });
    let hasSubscriptions = false;
    let isRealtimeConnected = false;

    // Community subscriptions
    if (!formatPreferences || formatPreferences.community) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_join_requests' },
        () => {
          if (import.meta.env.DEV) console.log('[AdminNotifications] group_join_requests changed');
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
          if (import.meta.env.DEV) console.log('[AdminNotifications] conversations changed');
          fetchCounts();
        }
      );
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          if (import.meta.env.DEV) console.log('[AdminNotifications] chat_messages changed');
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
          if (import.meta.env.DEV) console.log('[AdminNotifications] reservations changed');
          fetchCounts();
        }
      );
      hasSubscriptions = true;
    }

    // Assistant messages - try Realtime but also use polling for reliability
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'assistant_messages' },
      (payload) => {
        console.log('[AdminNotifications] Realtime: New assistant message INSERT:', payload);
        fetchCounts();
        // Emit event for toast popup if it's a new user message
        const newMsg = payload.new as { sender_type?: string; id?: string; conversation_id?: string; message_text?: string };
        if (newMsg?.sender_type === 'user') {
          console.log('[AdminNotifications] Dispatching new-assistant-message event from Realtime');
          window.dispatchEvent(new CustomEvent('new-assistant-message', { detail: newMsg }));
        }
      }
    );
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'assistant_messages' },
      () => fetchCounts()
    );
    hasSubscriptions = true;

    // Only subscribe if we have at least one active subscription
    if (hasSubscriptions) {
      channel.subscribe((status, err) => {
        if (import.meta.env.DEV) {
          console.log('[AdminNotifications] Realtime subscription status:', status);
          if (err) console.error('[AdminNotifications] Subscription error:', err);
        }
        isRealtimeConnected = status === 'SUBSCRIBED';
      });
      channelRef.current = channel;
    }

    // Polling interval for all notifications (backup for unreliable Realtime)
    // Only triggers when Realtime is disconnected
    const pollInterval = setInterval(() => {
      if (!isRealtimeConnected) {
        if (import.meta.env.DEV) console.log('[AdminNotifications] Polling fallback triggered (Realtime disconnected)');
        fetchJoinRequests();
        fetchCounts();
      }
    }, 30000);

    // Dedicated polling for assistant messages — ONLY when Realtime is disconnected.
    // When Realtime is connected, the INSERT subscription handles instant notifications.
    const assistantPollInterval = setInterval(async () => {
      // Skip if Realtime is connected — the INSERT handler above covers this case
      if (isRealtimeConnected) return;

      try {
        const { data: latest, error } = await supabase
          .from('assistant_messages')
          .select('id, conversation_id, message_text, sender_type, created_at')
          .eq('sender_type', 'user')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!latest?.created_at) return;

        const lastSeenTime = lastAssistantMsgTimeRef.current;
        if (!lastSeenTime || latest.created_at > lastSeenTime) {
          if (import.meta.env.DEV) {
            console.log('[AdminNotifications] Poll detected new assistant message:', latest.id);
          }

          lastAssistantMsgTimeRef.current = latest.created_at;

          window.dispatchEvent(
            new CustomEvent('new-assistant-message', {
              detail: {
                id: latest.id,
                conversation_id: latest.conversation_id,
                message_text: latest.message_text,
                sender_type: latest.sender_type,
              },
            })
          );

          fetchCounts();
        }
      } catch (err) {
        console.error('[AdminNotifications] Assistant poll error:', err);
      }
    }, 30000); // Poll every 30s (only when Realtime is down)

    // Also refresh when page becomes visible (tab switch, screen on)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (import.meta.env.DEV) console.log('[AdminNotifications] Page visible, refreshing...');
        fetchJoinRequests();
        fetchCounts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      clearInterval(assistantPollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchJoinRequests, fetchCounts, formatPreferences, primeAssistantLastSeen]);

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
