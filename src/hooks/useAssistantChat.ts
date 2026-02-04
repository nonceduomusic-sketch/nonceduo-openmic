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
}

export function useAssistantChat(conversationId: string | null) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assistant_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages((data || []) as AssistantMessage[]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = async (
    text: string,
    senderType: 'user' | 'bot' | 'admin',
    senderName?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!conversationId) return null;

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const insertData = {
        conversation_id: conversationId,
        sender_type: senderType,
        sender_name: senderName || (senderType === 'admin' ? 'Staff' : 'Utente'),
        sender_user_id: senderType === 'admin' ? session?.session?.user?.id : null,
        message_text: text,
        message_type: 'text',
        metadata: metadata || {},
      };
      
      const { data, error } = await supabase
        .from('assistant_messages')
        .insert(insertData as never)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return null;
      }

      // Update conversation updated_at
      await supabase
        .from('assistant_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  };

  // Realtime subscription
  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    const channel = supabase
      .channel(`assistant-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assistant_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as AssistantMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
  };
}
