import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssistantMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  sender_user_id: string | null;
  message_text: string;
  message_type: string;
  metadata: unknown;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  delivery_status?: string;
}

export interface AssistantConversation {
  id: string;
  session_id: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  source_section: string;
  source_url: string | null;
  status: 'active' | 'resolved' | 'archived';
  flow_path: string[] | null;
  lead_type: string | null;
  lead_score: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  // Virtual field for last message
  last_message?: AssistantMessage;
  unread_count?: number;
}

export function useAssistantConversations() {
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const fetchConversations = useCallback(async () => {
    try {
      // Fetch conversations with their messages
      const { data: convData, error: convError } = await supabase
        .from('assistant_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (convError) {
        console.error('Error fetching conversations:', convError);
        return;
      }

      if (!convData || convData.length === 0) {
        setConversations([]);
        setUnreadTotal(0);
        return;
      }

      // Fetch messages for all conversations
      const { data: msgData, error: msgError } = await supabase
        .from('assistant_messages')
        .select('*')
        .in('conversation_id', convData.map(c => c.id))
        .order('created_at', { ascending: false });

      if (msgError) {
        console.error('Error fetching messages:', msgError);
      }

      // Group messages by conversation
      const messagesByConv = (msgData || []).reduce((acc, msg) => {
        if (!acc[msg.conversation_id]) {
          acc[msg.conversation_id] = [];
        }
        acc[msg.conversation_id].push(msg);
        return acc;
      }, {} as Record<string, AssistantMessage[]>);

      // Enrich conversations with last message and unread count
      const enriched = convData.map(conv => {
        const messages = messagesByConv[conv.id] || [];
        const unreadCount = messages.filter(
          m => m.sender_type === 'user' && !m.is_read
        ).length;
        
        return {
          ...conv,
          last_message: messages[0],
          unread_count: unreadCount,
        } as AssistantConversation;
      });

      setConversations(enriched);
      setUnreadTotal(enriched.reduce((sum, c) => sum + (c.unread_count || 0), 0));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('assistant_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString(),
          delivery_status: 'read'
        })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'user')
        .eq('is_read', false);

      // Update local state
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const updateStatus = async (conversationId: string, status: 'active' | 'resolved' | 'archived') => {
    try {
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('assistant_conversations')
        .update(updates)
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, status } : c
        )
      );
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      // First delete all messages in the conversation
      await supabase
        .from('assistant_messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Then delete the conversation
      const { error } = await supabase
        .from('assistant_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      return true;
    } catch (err) {
      console.error('Error deleting conversation:', err);
      return false;
    }
  };

  // Realtime subscription
  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('assistant-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assistant_conversations' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assistant_messages' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    unreadTotal,
    refetch: fetchConversations,
    markAsRead,
    updateStatus,
    deleteConversation,
  };
}