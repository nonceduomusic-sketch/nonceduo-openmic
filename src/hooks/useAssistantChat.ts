import { useState, useEffect, useCallback, useRef } from 'react';
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
  delivery_status: 'sent' | 'delivered' | 'read';
  edited_at: string | null;
}

export function useAssistantChat(conversationId: string | null) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const didInitialLoadRef = useRef(false);

  const fetchMessages = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      didInitialLoadRef.current = false;
      return;
    }

    try {
      if (!silent) setLoading(true);

      const { data, error } = await supabase
        .from('assistant_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Mark user messages as delivered when admin fetches them
      const undeliveredUserMsgs = (data || []).filter(
        m => m.sender_type === 'user' && m.delivery_status === 'sent'
      );
      
      if (undeliveredUserMsgs.length > 0) {
        await supabase
          .from('assistant_messages')
          .update({ delivery_status: 'delivered' })
          .in('id', undeliveredUserMsgs.map(m => m.id));
      }

      setMessages((data || []) as AssistantMessage[]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      if (!silent) setLoading(false);
      didInitialLoadRef.current = true;
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
        delivery_status: 'sent',
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

  const editMessage = async (messageId: string, newText: string) => {
    try {
      const { error } = await supabase
        .from('assistant_messages')
        .update({ 
          message_text: newText, 
          edited_at: new Date().toISOString() 
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error editing message:', error);
        return false;
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, message_text: newText, edited_at: new Date().toISOString() }
            : m
        )
      );
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('assistant_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return false;
      }

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('assistant_messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString(),
          delivery_status: 'read'
        })
        .eq('id', messageId);

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, is_read: true, delivery_status: 'read' as const }
            : m
        )
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Realtime subscription
  useEffect(() => {
    fetchMessages({ silent: false });

    if (!conversationId) return;

    const channel = supabase
      .channel(`assistant-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assistant_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new as AssistantMessage]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev =>
              prev.map(m => m.id === payload.new.id ? payload.new as AssistantMessage : m)
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  // Polling fallback (spunte + nuovi messaggi) – Realtime può essere intermittente
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      // Dopo il primo load, evita spinner/flicker durante i refresh
      fetchMessages({ silent: didInitialLoadRef.current });
    }, 2500);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages({ silent: true });
      }
    };

    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [conversationId, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    refetch: fetchMessages,
  };
}