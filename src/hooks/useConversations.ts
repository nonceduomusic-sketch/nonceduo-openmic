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
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage;
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
    publicGroups,
    loading,
    isBlocked,
    startConversation,
    sendMessage,
    editMessage,
    joinPublicGroup,
    adminReply,
    adminEditMessage,
    adminDeleteMessage,
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
    getUnreadConversations,
    getReadConversations,
    refetch: fetchConversations,
  };
};
