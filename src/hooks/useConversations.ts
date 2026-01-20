import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  sender_session_id: string | null;
  message_text: string;
  edited_at: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  conversation_id: string;
  participant_name: string;
  session_id: string;
  joined_at: string;
}

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  is_public?: boolean;
  allowed_participants?: string[];
  created_at: string;
  updated_at: string;
  participants?: Participant[];
  messages?: ChatMessage[];
  last_message?: ChatMessage;
  unread_count?: number;
}

// Helper for admin API calls
const callAdminChatApi = async (action: string, data: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Non autenticato');
  }

  const response = await supabase.functions.invoke('admin-chat', {
    body: { action, ...data },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  return response.data;
};

export const useConversations = (sessionId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      // Fetch conversations with participants
      let query = supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(*),
          messages:chat_messages(*)
        `)
        .order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Process conversations to add last_message and filter by session if provided
      const processedConversations = (data || [])
        .map((conv: any) => {
          const messages = conv.messages || [];
          const sortedMessages = messages.sort(
            (a: ChatMessage, b: ChatMessage) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          return {
            ...conv,
            last_message: sortedMessages[0] || null,
            messages: sortedMessages,
          };
        })
        .filter((conv: Conversation) => {
          // If sessionId is provided, filter to only user's conversations
          if (sessionId) {
            return conv.participants?.some(p => p.session_id === sessionId);
          }
          return true;
        });

      setConversations(processedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Errore nel caricamento delle conversazioni');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to realtime changes for conversations
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage;
            // Dispatch event for notification
            window.dispatchEvent(
              new CustomEvent('new-chat-message', { detail: newMessage })
            );
          }
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [fetchConversations]);

  // Start a new conversation (for users)
  const startConversation = async (
    senderName: string,
    messageText: string,
    senderSessionId: string
  ): Promise<string | null> => {
    try {
      // Create conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert([{ is_group: false }])
        .select()
        .single();

      if (convError) throw convError;

      // Add participant
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([{
          conversation_id: convData.id,
          participant_name: senderName,
          session_id: senderSessionId,
        }]);

      if (partError) throw partError;

      // Add initial message
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: convData.id,
          sender_type: 'user',
          sender_name: senderName,
          sender_session_id: senderSessionId,
          message_text: messageText,
        }]);

      if (msgError) throw msgError;

      toast.success('Messaggio inviato!');
      return convData.id;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Errore nell\'invio del messaggio');
      return null;
    }
  };

  // Send message to existing conversation (for users)
  const sendMessage = async (
    conversationId: string,
    senderName: string,
    messageText: string,
    senderSessionId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: conversationId,
          sender_type: 'user',
          sender_name: senderName,
          sender_session_id: senderSessionId,
          message_text: messageText,
        }]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio');
      return false;
    }
  };

  // Edit message (for users - their own messages only)
  const editMessage = async (
    messageId: string,
    newText: string,
    senderSessionId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          message_text: newText,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_session_id', senderSessionId);

      if (error) throw error;
      toast.success('Messaggio modificato');
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Errore nella modifica');
      return false;
    }
  };

  // Admin: Send reply
  const adminReply = async (
    conversationId: string,
    messageText: string
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('sendMessage', {
        conversation_id: conversationId,
        message_text: messageText,
      });
      return true;
    } catch (error) {
      console.error('Error sending admin reply:', error);
      toast.error('Errore nell\'invio della risposta');
      return false;
    }
  };

  // Admin: Edit any message
  const adminEditMessage = async (
    messageId: string,
    newText: string
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('editMessage', {
        message_id: messageId,
        message_text: newText,
      });
      toast.success('Messaggio modificato');
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Errore nella modifica');
      return false;
    }
  };

  // Admin: Delete message
  const adminDeleteMessage = async (messageId: string): Promise<boolean> => {
    try {
      await callAdminChatApi('deleteMessage', { message_id: messageId });
      toast.success('Messaggio eliminato');
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Errore nell\'eliminazione');
      return false;
    }
  };

  // Admin: Delete conversation
  const adminDeleteConversation = async (conversationId: string): Promise<boolean> => {
    try {
      await callAdminChatApi('deleteConversation', { conversation_id: conversationId });
      toast.success('Conversazione eliminata');
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Errore nell\'eliminazione');
      return false;
    }
  };

  // Admin: Merge conversations into a group
  const adminMergeConversations = async (
    conversationIds: string[],
    groupName: string
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('mergeConversations', {
        conversation_ids: conversationIds,
        group_name: groupName,
      });
      toast.success('Conversazioni unite in gruppo!');
      return true;
    } catch (error) {
      console.error('Error merging conversations:', error);
      toast.error('Errore nella creazione del gruppo');
      return false;
    }
  };

  // Admin: Rename group
  const adminRenameGroup = async (
    conversationId: string,
    newName: string
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('renameGroup', {
        conversation_id: conversationId,
        name: newName,
      });
      toast.success('Gruppo rinominato');
      return true;
    } catch (error) {
      console.error('Error renaming group:', error);
      toast.error('Errore nel rinominare');
      return false;
    }
  };

  // Admin: Set group visibility
  const adminSetGroupVisibility = async (
    conversationId: string,
    isPublic: boolean,
    allowedParticipants?: string[]
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('setVisibility', {
        conversation_id: conversationId,
        is_public: isPublic,
        allowed_participants: allowedParticipants || [],
      });
      toast.success(isPublic ? 'Gruppo reso pubblico' : 'Gruppo reso privato');
      return true;
    } catch (error) {
      console.error('Error setting visibility:', error);
      toast.error('Errore nel cambiare visibilità');
      return false;
    }
  };

  // Admin: Bulk delete conversations
  const adminBulkDeleteConversations = async (conversationIds: string[]): Promise<boolean> => {
    try {
      await callAdminChatApi('bulkDeleteConversations', {
        conversation_ids: conversationIds,
      });
      toast.success(`${conversationIds.length} conversazioni eliminate`);
      return true;
    } catch (error) {
      console.error('Error bulk deleting conversations:', error);
      toast.error('Errore nell\'eliminazione');
      return false;
    }
  };

  // Get conversations with unread messages (messages from users without admin reply after)
  const getUnreadConversations = () => {
    return conversations.filter(conv => {
      if (!conv.messages || conv.messages.length === 0) return false;
      const lastMessage = conv.messages[0]; // Already sorted by date desc
      return lastMessage.sender_type === 'user';
    });
  };

  // Get conversations with all messages read (last message is from admin)
  const getReadConversations = () => {
    return conversations.filter(conv => {
      if (!conv.messages || conv.messages.length === 0) return false;
      const lastMessage = conv.messages[0];
      return lastMessage.sender_type === 'admin';
    });
  };

  return {
    conversations,
    loading,
    startConversation,
    sendMessage,
    editMessage,
    adminReply,
    adminEditMessage,
    adminDeleteMessage,
    adminDeleteConversation,
    adminMergeConversations,
    adminRenameGroup,
    adminSetGroupVisibility,
    adminBulkDeleteConversations,
    getUnreadConversations,
    getReadConversations,
    refetch: fetchConversations,
  };
};
