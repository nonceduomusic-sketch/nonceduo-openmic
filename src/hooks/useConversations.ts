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
  section?: ConversationSection;
  is_public?: boolean;
  is_read?: boolean;
  allowed_participants?: string[];
  password_hash?: string | null;
  password_hint?: string | null;
  visibility?: 'public' | 'admin_only' | 'author_only';
  created_at: string;
  updated_at: string;
  participants?: Participant[];
  messages?: ChatMessage[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface GroupMember extends Participant {
  is_blocked: boolean;
}

export type ConversationSection = 'dediche' | 'community';

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

export const useConversations = (sessionId?: string, section?: ConversationSection) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [publicGroups, setPublicGroups] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  // NOTE:
  // Dediche chats are session-based (x-session-id) even if the user is authenticated.
  // RLS policies for chat tables rely on the session id header, which is not available
  // over Realtime and can be inconsistent for logged-in users.
  // Therefore, for section === 'dediche' we always list conversations via the backend function.
  const isDedicheSection = section === 'dediche';

  // User chat API calls (server-side logic, works for both anonymous + authenticated users)
  const callUserChatApi = useCallback(
    async <T,>(action: string, data: Record<string, unknown>): Promise<T> => {
      const res = await supabase.functions.invoke('user-chat', {
        body: { action, ...data },
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      if ((res.data as any)?.error) {
        throw new Error((res.data as any).error);
      }

      return res.data as T;
    },
    []
  );

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
      if (import.meta.env.DEV) console.error('Error checking block status:', error);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    // Don't fetch if we're anonymous and don't have a sessionId yet
    const { data: authSession } = await supabase.auth.getSession();
    const isAnon = !authSession?.session;

    // For Dediche user-side (anonymous users) we always use the session-based backend listing
    // to avoid RLS/header issues.
    // For admin (authenticated users without sessionId), use direct queries.
    const shouldUseUserChatListing = Boolean(sessionId) && (isAnon || isDedicheSection);
    
    // CRITICAL: For Dediche section, we MUST have a sessionId to fetch user's conversations
    // Without it, the API cannot identify which conversations belong to this user
    if (isDedicheSection && !sessionId) {
      if (import.meta.env.DEV) console.log('[useConversations] Dediche: waiting for sessionId before fetching...');
      setLoading(false); // Don't leave in loading state
      return;
    }
    
    // For other sections, anonymous users also need sessionId
    if (isAnon && !sessionId) {
      if (import.meta.env.DEV) console.log('[useConversations] Waiting for sessionId before fetching...');
      return;
    }
    
    try {
      // For anonymous users we cannot rely on client-side RLS to list conversations
      // because it depends on request headers (x-session-id). Use the backend function.
      let data: any[] | null = null;

      if (shouldUseUserChatListing && sessionId) {
        console.log('[useConversations] Fetching via user-chat API for session:', sessionId.slice(0, 8) + '...');
        const fromApi = await callUserChatApi<{ conversations: any[] }>('listConversations', {
          session_id: sessionId,
          section: section ?? undefined,
        });
        data = fromApi.conversations || [];
        console.log('[useConversations] Got', data.length, 'conversations from API');
      } else {
        // Authenticated (or admin) can use direct queries.
        let query = supabase
          .from('conversations')
          .select(`
            *,
            participants:conversation_participants(*),
            messages:chat_messages(*)
          `)
          .order('updated_at', { ascending: false });

        if (section) {
          query = query.eq('section', section);
        }

        const { data: directData, error } = await query;
        if (error) throw error;
        data = directData;
      }

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

      // Separate user's conversations from available groups
      const userConvs = processedConversations.filter((conv: Conversation) => {
        if (sessionId) {
          return conv.participants?.some(p => p.session_id === sessionId);
        }
        return true;
      });

      // Groups available to join:
      // 1. Public groups where user is not already a participant
      // 2. Private groups where user is in allowed_participants but not yet a participant
      const availableGroups = processedConversations.filter((conv: Conversation) => {
        if (!conv.is_group) return false;
        
        // Already a participant? Don't show in available groups
        const isParticipant = sessionId && conv.participants?.some(p => p.session_id === sessionId);
        if (isParticipant) return false;
        
        // Public groups are visible to everyone
        if (conv.is_public) return true;
        
        // Private groups: check if user is in allowed_participants
        if (sessionId && conv.allowed_participants && conv.allowed_participants.length > 0) {
          return conv.allowed_participants.includes(sessionId);
        }
        
        return false;
      });

      setConversations(userConvs);
      setPublicGroups(availableGroups);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching conversations:', error);
      toast.error('Errore nel caricamento delle conversazioni');
    } finally {
      setLoading(false);
    }
  }, [sessionId, section, callUserChatApi, isDedicheSection]);

  useEffect(() => {
    fetchConversations();
    
    // Check if user is blocked
    if (sessionId) {
      checkIfBlocked(sessionId);
    }

    // Polling backup:
    // - Dediche: Realtime is unreliable for session-based access (no x-session-id over Realtime)
    //           so we poll more frequently to make admin replies appear quickly.
    // - Other sections: slower polling.
    const pollMs = isDedicheSection ? 2000 : 10000;
    const pollInterval = setInterval(() => {
      fetchConversations();
    }, pollMs);

    // Realtime subscription:
    // For Dediche user-side (sessionId present) polling is the reliable source of truth.
    // Keep realtime for admin/auth flows where RLS doesn't depend on x-session-id.
    let conversationsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (!(isDedicheSection && sessionId)) {
      const channelName = `conversations-changes-${sessionId || 'admin'}-${Date.now()}`;
      conversationsChannel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: true },
          },
        })
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
            if (import.meta.env.DEV) console.log('[useConversations] New message received via realtime:', newMessage.id?.slice(0, 8));
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
        .subscribe((status, err) => {
          if (import.meta.env.DEV) {
            console.log('[useConversations] Realtime subscription status:', status);
            if (err) console.error('[useConversations] Subscription error:', err);
          }
        });
    }

    return () => {
      clearInterval(pollInterval);
      if (conversationsChannel) {
        supabase.removeChannel(conversationsChannel);
      }
    };
  }, [fetchConversations, sessionId, checkIfBlocked, isDedicheSection]);

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
        section: section || 'dediche',
      });

      toast.success('Messaggio inviato!');

      const newConversation: Conversation = {
        ...conversation,
        participants: [participant],
        messages: [message],
        last_message: message,
      };

      // Optimistic: ensure the new conversation is immediately visible in the list
      setConversations(prev => {
        const withoutDup = prev.filter(c => c.id !== newConversation.id);
        return [newConversation, ...withoutDup];
      });

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
      const response = await callUserChatApi<{ message: ChatMessage }>('sendMessage', {
        conversation_id: conversationId,
        sender_name: senderName,
        message_text: messageText,
        session_id: senderSessionId,
      });

      // Optimistic update: add message to local state immediately
      if (response?.message) {
        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            const newMessages = [response.message, ...(conv.messages || [])];
            return {
              ...conv,
              messages: newMessages,
              last_message: response.message,
              updated_at: new Date().toISOString(),
            };
          }
          return conv;
        }));
      }

      // Also trigger a background refresh to ensure sync
      setTimeout(() => fetchConversations(), 500);

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

  // Admin: Set group visibility (for groups) or dediche visibility
  const adminSetGroupVisibility = async (
    conversationId: string,
    isPublic: boolean,
    allowedParticipants?: string[],
    dedicheVisibility?: 'public' | 'admin_only' | 'author_only'
  ): Promise<boolean> => {
    try {
      const payload: Record<string, unknown> = {
        conversation_id: conversationId,
      };
      
      // If dedicheVisibility is provided, use the new visibility column
      if (dedicheVisibility) {
        payload.visibility = dedicheVisibility;
      } else {
        // Legacy group visibility
        payload.is_public = isPublic;
        payload.allowed_participants = allowedParticipants || [];
      }
      
      await callAdminChatApi('setVisibility', payload);
      
      // Success message based on type
      if (dedicheVisibility) {
        const labels: Record<string, string> = {
          public: 'Dedica visibile a tutti',
          admin_only: 'Dedica visibile solo allo staff',
          author_only: 'Dedica visibile solo all\'autore',
        };
        toast.success(labels[dedicheVisibility]);
      } else {
        toast.success(isPublic ? 'Gruppo reso pubblico' : 'Gruppo reso privato');
      }
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

  // Admin: Create invite link
  const adminCreateInviteLink = async (
    conversationId: string,
    expiresInHours?: number,
    maxUses?: number
  ): Promise<{ invite_code: string } | null> => {
    try {
      const result = await callAdminChatApi('createInviteLink', {
        conversation_id: conversationId,
        expires_in_hours: expiresInHours,
        max_uses: maxUses,
      });
      return result?.data || null;
    } catch (error) {
      console.error('Error creating invite link:', error);
      toast.error('Errore nella creazione del link');
      return null;
    }
  };

  // Admin: Get invite links for a conversation
  const adminGetInviteLinks = async (conversationId: string): Promise<any[]> => {
    try {
      const result = await callAdminChatApi('getInviteLinks', {
        conversation_id: conversationId,
      });
      return result?.data || [];
    } catch (error) {
      console.error('Error getting invite links:', error);
      return [];
    }
  };

  // Admin: Revoke invite link
  const adminRevokeInviteLink = async (inviteId: string): Promise<boolean> => {
    try {
      await callAdminChatApi('revokeInviteLink', { invite_id: inviteId });
      return true;
    } catch (error) {
      console.error('Error revoking invite link:', error);
      toast.error('Errore nella revoca');
      return false;
    }
  };

  // Admin: Set or remove group password
  const adminSetGroupPassword = async (
    conversationId: string,
    password: string | null,
    passwordHint?: string
  ): Promise<boolean> => {
    try {
      await callAdminChatApi('setGroupPassword', {
        conversation_id: conversationId,
        password,
        password_hint: passwordHint,
      });
      toast.success(password ? 'Password impostata!' : 'Password rimossa!');
      return true;
    } catch (error) {
      console.error('Error setting group password:', error);
      toast.error('Errore nell\'impostare la password');
      return false;
    }
  };

  // Admin: Get group members
  const adminGetGroupMembers = async (conversationId: string): Promise<GroupMember[]> => {
    try {
      const result = await callAdminChatApi('getGroupMembers', {
        conversation_id: conversationId,
      });
      return result?.data || [];
    } catch (error) {
      console.error('Error getting group members:', error);
      return [];
    }
  };

  // Admin: Start private chat with a user
  const adminStartPrivateChat = async (
    participantName: string,
    sessionId: string,
    initialMessage?: string
  ): Promise<Conversation | null> => {
    try {
      const result = await callAdminChatApi('startPrivateChat', {
        participant_name: participantName,
        session_id: sessionId,
        initial_message: initialMessage,
      });
      if (result?.data?.is_new) {
        toast.success('Chat privata creata!');
      }
      await fetchConversations();
      return result?.data?.conversation || null;
    } catch (error) {
      console.error('Error starting private chat:', error);
      toast.error('Errore nella creazione della chat');
      return null;
    }
  };

  // Join public group with optional password (user)
  const joinPublicGroupWithPassword = async (
    conversationId: string,
    participantName: string,
    participantSessionId: string,
    password?: string
  ): Promise<{ success: boolean; requires_password?: boolean; password_hint?: string }> => {
    try {
      const result = await callUserChatApi<{ 
        success?: boolean; 
        already_member?: boolean;
        requires_password?: boolean;
        password_hint?: string;
        error?: string;
      }>('joinPublicGroup', {
        conversation_id: conversationId,
        participant_name: participantName,
        session_id: participantSessionId,
        password,
      });

      if (result.requires_password) {
        return { success: false, requires_password: true, password_hint: result.password_hint };
      }

      if (result.already_member) {
        toast.info('Sei già in questo gruppo');
      } else {
        toast.success('Sei entrato nel gruppo!');
      }

      await fetchConversations();
      return { success: true };
    } catch (error: any) {
      if (error.message?.includes('Password')) {
        return { success: false, requires_password: true };
      }
      console.error('Error joining group:', error);
      toast.error(error.message || 'Errore nell\'unirsi al gruppo');
      return { success: false };
    }
  };

  // Get unread conversations (non-group private chats with unread messages)
  const getUnreadConversations = () => {
    return conversations.filter(conv => {
      // For groups, we handle them separately
      if (conv.is_group) return false;
      // Check is_read column: false, null, or undefined means unread
      if ('is_read' in conv && conv.is_read !== true) {
        return true;
      }
      // Fallback for old conversations without is_read: check last message sender
      if (conv.messages && conv.messages.length > 0) {
        const lastMessage = conv.messages[0]; // Already sorted by date desc
        return lastMessage.sender_type === 'user';
      }
      return false;
    });
  };

  // Get conversations marked as read (is_read = true), non-group only
  const getReadConversations = () => {
    return conversations.filter(conv => {
      // For groups, we handle them separately
      if (conv.is_group) return false;
      // Check is_read column
      if ('is_read' in conv) {
        return conv.is_read === true;
      }
      // Fallback: last message is from admin
      if (conv.messages && conv.messages.length > 0) {
        const lastMessage = conv.messages[0];
        return lastMessage.sender_type === 'admin';
      }
      return false;
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
    joinPublicGroupWithPassword,
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
    adminCreateInviteLink,
    adminGetInviteLinks,
    adminRevokeInviteLink,
    adminSetGroupPassword,
    adminGetGroupMembers,
    adminStartPrivateChat,
    getUnreadConversations,
    getReadConversations,
    refetch: fetchConversations,
  };
};
