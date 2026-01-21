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
  status: 'sent' | 'delivered' | 'read';
  read_at: string | null;
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
  is_read?: boolean;
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
  const [publicGroups, setPublicGroups] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  // Check if user is blocked
  const checkIfBlocked = useCallback(async (userSessionId: string) => {
    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('session_id', userSessionId)
        .maybeSingle();
      
      if (data) {
        // Check if block has expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsBlocked(false);
        } else {
          setIsBlocked(true);
        }
      } else {
        setIsBlocked(false);
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      // Fetch all conversations user participates in
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

      // Process conversations
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
        });

      // Separate public groups from user's conversations
      const userConvs = processedConversations.filter((conv: Conversation) => {
        if (sessionId) {
          return conv.participants?.some(p => p.session_id === sessionId);
        }
        return true;
      });

      const pubGroups = processedConversations.filter((conv: Conversation) => {
        return conv.is_group && conv.is_public && 
          (!sessionId || !conv.participants?.some(p => p.session_id === sessionId));
      });

      setConversations(userConvs);
      setPublicGroups(pubGroups);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Errore nel caricamento delle conversazioni');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchConversations();
    
    // Check if user is blocked
    if (sessionId) {
      checkIfBlocked(sessionId);
    }

    // Subscribe to realtime changes
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          window.dispatchEvent(
            new CustomEvent('new-chat-message', { detail: newMessage })
          );
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          // Real-time status update without full refetch
          const updatedMessage = payload.new as ChatMessage;
          setConversations(prev => prev.map(conv => {
            if (conv.messages?.some(m => m.id === updatedMessage.id)) {
              return {
                ...conv,
                messages: conv.messages?.map(m => 
                  m.id === updatedMessage.id 
                    ? { ...m, status: updatedMessage.status, read_at: updatedMessage.read_at, edited_at: updatedMessage.edited_at, message_text: updatedMessage.message_text }
                    : m
                ),
              };
            }
            return conv;
          }));
          // Dispatch event for UI updates
          window.dispatchEvent(
            new CustomEvent('chat-message-updated', { detail: updatedMessage })
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_users' },
        () => {
          if (sessionId) {
            checkIfBlocked(sessionId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [fetchConversations, sessionId, checkIfBlocked]);

  // User chat API calls (avoids device-specific storage quirks)
  const callUserChatApi = useCallback(async <T,>(action: string, data: Record<string, unknown>): Promise<T> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-chat`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, ...data }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error((json as any)?.error || `HTTP ${res.status}`);
    }

    if ((json as any)?.error) {
      throw new Error((json as any).error);
    }

    return json as T;
  }, []);

  // Mark messages in a conversation as read (for user)
  const markMessagesAsRead = useCallback(async (conversationId: string, userSessionId: string) => {
    try {
      await callUserChatApi('markMessagesAsRead', {
        conversation_id: conversationId,
        session_id: userSessionId,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [callUserChatApi]);

  // Start a new conversation (for users)
  // Returns the full conversation object for immediate UI selection
  const startConversation = async (
    senderName: string,
    messageText: string,
    senderSessionId: string
  ): Promise<Conversation | null> => {
    try {
      const { conversation, participant, message } = await callUserChatApi<{
        conversation: Conversation;
        participant: Participant;
        message: ChatMessage;
      }>('startConversation', {
        sender_name: senderName,
        message_text: messageText,
        session_id: senderSessionId,
      });

      toast.success('Messaggio inviato!');

      const newConversation: Conversation = {
        ...conversation,
        participants: [participant],
        messages: [message],
        last_message: message,
      };

      // Refresh conversations in background
      fetchConversations();

      return newConversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error(error instanceof Error ? error.message : 'Errore nell\'invio del messaggio');
      return null;
    }
  };

  // Join a public group conversation
  const joinPublicGroup = async (
    conversationId: string,
    participantName: string,
    participantSessionId: string
  ): Promise<boolean> => {
    try {
      // Check if already a participant
      const existing = conversations.find(c => c.id === conversationId);
      if (existing) {
        toast.info('Sei già in questo gruppo');
        return true;
      }

      const { error } = await supabase
        .from('conversation_participants')
        .insert([{
          conversation_id: conversationId,
          participant_name: participantName,
          session_id: participantSessionId,
        }]);

      if (error) throw error;
      toast.success('Sei entrato nel gruppo!');

      // Refresh conversations to include the newly joined group
      await fetchConversations();

      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Errore nell\'unirsi al gruppo');
      return false;
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
      await callUserChatApi<{ message: ChatMessage }>('sendMessage', {
        conversation_id: conversationId,
        sender_name: senderName,
        message_text: messageText,
        session_id: senderSessionId,
      });

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Errore nell\'invio del messaggio');
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

  // Admin: Delete message (returns the message for undo)
  const adminDeleteMessage = async (messageId: string, conversationId: string): Promise<ChatMessage | null> => {
    try {
      // Find the message before deleting for potential restore
      const conv = conversations.find(c => c.id === conversationId);
      const msgToDelete = conv?.messages?.find(m => m.id === messageId);
      
      await callAdminChatApi('deleteMessage', { message_id: messageId });
      
      return msgToDelete || null;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Errore nell\'eliminazione');
      return null;
    }
  };

  // Admin: Restore a deleted message
  const adminRestoreMessage = async (message: ChatMessage): Promise<boolean> => {
    try {
      await callAdminChatApi('restoreMessage', { message });
      toast.success('Messaggio ripristinato!');
      return true;
    } catch (error) {
      console.error('Error restoring message:', error);
      toast.error('Errore nel ripristino');
      return false;
    }
  };

  // Admin: Bulk delete messages (returns deleted messages for undo)
  const adminBulkDeleteMessages = async (messageIds: string[], conversationId: string): Promise<ChatMessage[]> => {
    try {
      // Find messages before deleting for potential restore
      const conv = conversations.find(c => c.id === conversationId);
      const msgsToDelete = conv?.messages?.filter(m => messageIds.includes(m.id)) || [];
      
      await callAdminChatApi('bulkDeleteMessages', { message_ids: messageIds });
      
      return msgsToDelete;
    } catch (error) {
      console.error('Error bulk deleting messages:', error);
      toast.error('Errore nell\'eliminazione');
      return [];
    }
  };

  // Admin: Bulk restore messages
  const adminBulkRestoreMessages = async (messages: ChatMessage[]): Promise<boolean> => {
    try {
      await callAdminChatApi('bulkRestoreMessages', { messages });
      toast.success(`${messages.length} messaggi ripristinati!`);
      return true;
    } catch (error) {
      console.error('Error restoring messages:', error);
      toast.error('Errore nel ripristino');
      return false;
    }
  };

  // Admin: Delete conversation (returns the deleted conversation for undo)
  const adminDeleteConversation = async (conversationId: string): Promise<Conversation | null> => {
    try {
      // First, get the full conversation data for potential restore
      const convToDelete = conversations.find(c => c.id === conversationId);
      
      await callAdminChatApi('deleteConversation', { conversation_id: conversationId });
      
      // Return the deleted conversation data (for undo)
      return convToDelete || null;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Errore nell\'eliminazione');
      return null;
    }
  };

  // Admin: Restore a deleted conversation
  const adminRestoreConversation = async (conversation: Conversation): Promise<boolean> => {
    try {
      await callAdminChatApi('restoreConversation', {
        conversation: {
          id: conversation.id,
          name: conversation.name,
          is_group: conversation.is_group,
          is_public: conversation.is_public,
          allowed_participants: conversation.allowed_participants,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        },
        participants: conversation.participants || [],
        messages: conversation.messages || [],
      });
      toast.success('Conversazione ripristinata!');
      return true;
    } catch (error) {
      console.error('Error restoring conversation:', error);
      toast.error('Errore nel ripristino');
      return false;
    }
  };

  // Admin: Create a new group (optionally from selected conversations)
  const adminCreateGroup = async (
    conversationIds: string[],
    groupName: string,
    isPublic: boolean = false
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('createGroup', {
        conversation_ids: conversationIds,
        group_name: groupName,
        is_public: isPublic,
      });
      toast.success(isPublic ? 'Gruppo pubblico creato!' : 'Gruppo privato creato!');
      return true;
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Errore nella creazione del gruppo');
      return false;
    }
  };

  // Admin: Create empty group directly
  const adminCreateEmptyGroup = async (
    groupName: string,
    isPublic: boolean = false
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('createGroup', {
        conversation_ids: [],
        group_name: groupName,
        is_public: isPublic,
      });
      toast.success(isPublic ? 'Gruppo pubblico creato!' : 'Gruppo privato creato!');
      return true;
    } catch (error) {
      console.error('Error creating empty group:', error);
      toast.error('Errore nella creazione del gruppo');
      return false;
    }
  };

  // Admin: Add participants to an existing group
  const adminAddToGroup = async (
    groupId: string,
    conversationIds: string[]
  ): Promise<boolean> => {
    try {
      const result = await callAdminChatApi('addToGroup', {
        group_id: groupId,
        conversation_ids: conversationIds,
      });
      const added = result?.data?.added || 0;
      toast.success(`${added} partecipanti aggiunti al gruppo!`);
      return true;
    } catch (error) {
      console.error('Error adding to group:', error);
      toast.error('Errore nell\'aggiungere al gruppo');
      return false;
    }
  };

  // Admin: Remove participant from group
  const adminRemoveFromGroup = async (
    groupId: string,
    sessionId: string
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('removeFromGroup', {
        group_id: groupId,
        session_id: sessionId,
      });
      toast.success('Partecipante rimosso dal gruppo');
      return true;
    } catch (error) {
      console.error('Error removing from group:', error);
      toast.error('Errore nella rimozione');
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

  // Admin: Block user
  const adminBlockUser = async (
    sessionId: string,
    reason?: string,
    expiresInHours?: number
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('blockUser', {
        session_id: sessionId,
        reason,
        expires_in_hours: expiresInHours,
      });
      toast.success('Utente bloccato');
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Errore nel bloccare l\'utente');
      return false;
    }
  };

  // Admin: Unblock user
  const adminUnblockUser = async (sessionId: string): Promise<boolean> => {
    try {
      await callAdminChatApi('unblockUser', { session_id: sessionId });
      toast.success('Utente sbloccato');
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Errore nello sbloccare l\'utente');
      return false;
    }
  };

  // Admin: Mark conversation as read
  const adminMarkAsRead = async (conversationId: string): Promise<boolean> => {
    try {
      await callAdminChatApi('markAsRead', { conversation_id: conversationId });
      return true;
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Errore nel segnare come letto');
      return false;
    }
  };

  // Admin: Mark conversation as unread
  const adminMarkAsUnread = async (conversationId: string): Promise<boolean> => {
    try {
      await callAdminChatApi('markAsUnread', { conversation_id: conversationId });
      return true;
    } catch (error) {
      console.error('Error marking as unread:', error);
      toast.error('Errore nel segnare come da leggere');
      return false;
    }
  };

  // Get conversations with unread messages (is_read = false)
  const getUnreadConversations = () => {
    return conversations.filter(conv => {
      if (!conv.messages || conv.messages.length === 0) return false;
      // Use is_read column if available, fallback to sender_type check
      if ('is_read' in conv) {
        return conv.is_read === false;
      }
      const lastMessage = conv.messages[0]; // Already sorted by date desc
      return lastMessage.sender_type === 'user';
    });
  };

  // Get conversations marked as read (is_read = true)
  const getReadConversations = () => {
    return conversations.filter(conv => {
      if (!conv.messages || conv.messages.length === 0) return false;
      // Use is_read column if available, fallback to sender_type check
      if ('is_read' in conv) {
        return conv.is_read === true;
      }
      const lastMessage = conv.messages[0];
      return lastMessage.sender_type === 'admin';
    });
  };

  return {
    conversations,
    publicGroups,
    loading,
    isBlocked,
    startConversation,
    sendMessage,
    editMessage,
    joinPublicGroup,
    markMessagesAsRead,
    adminReply,
    adminEditMessage,
    adminDeleteMessage,
    adminRestoreMessage,
    adminBulkDeleteMessages,
    adminBulkRestoreMessages,
    adminDeleteConversation,
    adminRestoreConversation,
    adminCreateGroup,
    adminCreateEmptyGroup,
    adminAddToGroup,
    adminRemoveFromGroup,
    adminRenameGroup,
    adminSetGroupVisibility,
    adminBulkDeleteConversations,
    adminBlockUser,
    adminUnblockUser,
    adminMarkAsRead,
    adminMarkAsUnread,
    getUnreadConversations,
    getReadConversations,
    refetch: fetchConversations,
  };
};
