import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Message {
  id: string;
  sender_name: string;
  message_text: string;
  is_read: boolean;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

// Helper function for admin API calls
const callAdminApi = async (action: string, data: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    if (import.meta.env.DEV) console.error('Admin API call failed: No session');
    throw new Error('Non autenticato');
  }

  if (import.meta.env.DEV) console.log('Admin API call:', action);

  const response = await supabase.functions.invoke('admin-messages', {
    body: { action, ...data },
  });

  if (response.error) {
    if (import.meta.env.DEV) console.error('Admin API error:', response.error);
    throw new Error(response.error.message);
  }

  // Check if the response data indicates an error
  if (response.data?.error) {
    if (import.meta.env.DEV) console.error('Admin API returned error:', response.data.error);
    throw new Error(response.data.error);
  }

  return response.data;
};

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            setMessages((prev) => [newMessage, ...prev]);
            
            // Dispatch event for notification
            window.dispatchEvent(
              new CustomEvent('new-message', { detail: newMessage })
            );
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Errore nel caricamento dei messaggi');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (senderName: string, messageText: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{ sender_name: senderName, message_text: messageText }]);

      if (error) throw error;
      toast.success('Messaggio inviato con successo!');
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio');
      return false;
    }
  };

  const markAsRead = async (id: string): Promise<boolean> => {
    try {
      await callAdminApi('markAsRead', { id });
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast.error('Errore nel segnare come letto');
      return false;
    }
  };

  const markAsUnread = async (id: string): Promise<boolean> => {
    try {
      await callAdminApi('markAsUnread', { id });
      return true;
    } catch (error) {
      console.error('Error marking message as unread:', error);
      toast.error('Errore nel segnare come non letto');
      return false;
    }
  };

  const replyToMessage = async (id: string, reply: string): Promise<boolean> => {
    try {
      await callAdminApi('reply', { id, reply });
      toast.success('Risposta inviata!');
      return true;
    } catch (error) {
      console.error('Error replying to message:', error);
      toast.error('Errore nell\'invio della risposta');
      return false;
    }
  };

  const deleteMessage = async (id: string): Promise<boolean> => {
    try {
      await callAdminApi('delete', { id });
      toast.success('Messaggio eliminato');
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Errore nell\'eliminazione');
      return false;
    }
  };

  const restoreMessage = async (message: Message): Promise<boolean> => {
    try {
      await callAdminApi('restore', { message });
      return true;
    } catch (error) {
      console.error('Error restoring message:', error);
      toast.error('Errore nel ripristino');
      return false;
    }
  };

  const unreadMessages = messages.filter((m) => !m.is_read);
  const readMessages = messages.filter((m) => m.is_read);

  return {
    messages,
    unreadMessages,
    readMessages,
    loading,
    sendMessage,
    markAsRead,
    markAsUnread,
    replyToMessage,
    deleteMessage,
    restoreMessage,
  };
};
