import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

export interface AssistantSettings {
  is_enabled: boolean;
  enabled_on_site: boolean;
  enabled_on_openmic: boolean;
  enabled_on_dediche: boolean;
  enabled_on_community: boolean;
  proactive_delay_seconds: number;
  welcome_message: string;
}

export interface AssistantMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  message_text: string;
  message_type: string;
  metadata: unknown;
  is_read: boolean;
  created_at: string;
  delivery_status: 'sent' | 'delivered' | 'read';
}

type Section = 'site' | 'openmic' | 'dediche' | 'community';

const STORAGE_KEY = 'assistant_conversation_id';
const SESSION_KEY = 'assistant_session_id';

export function useAssistantWidget(currentSection: Section = 'site') {
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showProactive, setShowProactive] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const isMobile = useIsMobile();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get or create session ID
  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  }, []);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('assistant_settings')
          .select('*')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching assistant settings:', error);
          return;
        }

        setSettings(data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Restore existing conversation on mount
  useEffect(() => {
    const restoreConversation = async () => {
      const storedConvId = localStorage.getItem(STORAGE_KEY);
      if (!storedConvId) return;

      try {
        // Verify the conversation still exists and is active
        const { data, error } = await supabase
          .from('assistant_conversations')
          .select('id, status')
          .eq('id', storedConvId)
          .single();

        if (error || !data) {
          // Conversation doesn't exist, clear storage
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Only restore if not archived
        if (data.status !== 'archived') {
          setConversationId(storedConvId);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (err) {
        console.error('Error restoring conversation:', err);
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    restoreConversation();
  }, []);

  // Fetch messages when conversation is set
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setMessagesLoading(true);
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

        // Mark admin messages as read when user fetches them
        const unreadAdminMsgs = (data || []).filter(
          m => m.sender_type === 'admin' && !m.is_read
        );

        if (unreadAdminMsgs.length > 0) {
          await supabase
            .from('assistant_messages')
            .update({ 
              is_read: true, 
              read_at: new Date().toISOString(),
              delivery_status: 'read' 
            })
            .in('id', unreadAdminMsgs.map(m => m.id));
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`user-assistant-chat-${conversationId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assistant_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as AssistantMessage;
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // If admin message, mark as read immediately
            if (newMsg.sender_type === 'admin' && isOpen) {
              await supabase
                .from('assistant_messages')
                .update({ 
                  is_read: true, 
                  read_at: new Date().toISOString(),
                  delivery_status: 'read' 
                })
                .eq('id', newMsg.id);
            }
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

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, isOpen]);

  // Check if assistant is enabled for current section
  const isEnabled = useCallback(() => {
    if (!settings || !settings.is_enabled) return false;

    switch (currentSection) {
      case 'site':
        return settings.enabled_on_site;
      case 'openmic':
        return settings.enabled_on_openmic;
      case 'dediche':
        return settings.enabled_on_dediche;
      case 'community':
        return settings.enabled_on_community;
      default:
        return false;
    }
  }, [settings, currentSection]);

  // Proactive opening
  useEffect(() => {
    if (!isEnabled() || isOpen) return;

    const delay = settings?.proactive_delay_seconds || 5;
    const timer = setTimeout(() => {
      const hasInteracted = sessionStorage.getItem('assistant_interacted');
      if (!hasInteracted) {
        setShowProactive(true);
      }
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [settings, isEnabled, isOpen]);

  // Create or get conversation
  const getOrCreateConversation = useCallback(async (
    userName?: string,
    userEmail?: string,
    leadType?: string
  ) => {
    if (conversationId) return conversationId;

    const sessionId = getSessionId();

    try {
      // First, try to find an existing conversation for this session
      const { data: existing, error: findError } = await supabase
        .from('assistant_conversations')
        .select('id, status')
        .eq('session_id', sessionId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing && !findError) {
        setConversationId(existing.id);
        localStorage.setItem(STORAGE_KEY, existing.id);
        return existing.id;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('assistant_conversations')
        .insert({
          session_id: sessionId,
          source_section: currentSection,
          source_url: window.location.href,
          user_name: userName,
          user_email: userEmail,
          lead_type: leadType,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      setConversationId(data.id);
      localStorage.setItem(STORAGE_KEY, data.id);
      return data.id;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, [conversationId, currentSection, getSessionId]);

  // Send message
  const sendMessage = useCallback(async (
    text: string,
    senderType: 'user' | 'bot' = 'user',
    senderName?: string,
    metadata?: Record<string, unknown>
  ) => {
    let convId = conversationId;
    if (!convId) {
      convId = await getOrCreateConversation(senderName);
    }
    if (!convId) return null;

    try {
      const { data, error } = await supabase
        .from('assistant_messages')
        .insert({
          conversation_id: convId,
          sender_type: senderType,
          sender_name: senderName || (senderType === 'bot' ? 'Assistente' : 'Visitatore'),
          message_text: text,
          message_type: 'text',
          metadata: metadata || {},
          delivery_status: 'sent',
        } as never)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return null;
      }

      // Add message to local state immediately (realtime will also pick it up, but this ensures immediate UI update)
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data as AssistantMessage];
      });

      // Update conversation
      await supabase
        .from('assistant_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

      // Send Telegram notification for user messages
      if (senderType === 'user') {
        try {
          const songRequest = (metadata as Record<string, unknown>)?.song_request;
          const isComplete = (metadata as Record<string, unknown>)?.isComplete;
          
          await supabase.functions.invoke('assistant-telegram', {
            body: {
              conversationId: convId,
              messageText: text,
              userName: senderName || 'Visitatore',
              sourceSection: currentSection,
              songRequest: songRequest || null,
              isComplete: isComplete || false,
            },
          });
        } catch (telegramErr) {
          console.error('Error sending Telegram notification:', telegramErr);
        }
      }

      return data;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, [conversationId, getOrCreateConversation, currentSection]);

  // Update conversation with lead info
  const updateConversation = useCallback(async (updates: {
    user_name?: string;
    user_email?: string;
    lead_type?: string;
    lead_score?: number;
    flow_path?: string[];
  }) => {
    if (!conversationId) return;

    try {
      await supabase
        .from('assistant_conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch (err) {
      console.error('Error updating conversation:', err);
    }
  }, [conversationId]);

  const open = useCallback(() => {
    setIsOpen(true);
    setShowProactive(false);
    sessionStorage.setItem('assistant_interacted', 'true');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dismissProactive = useCallback(() => {
    setShowProactive(false);
    sessionStorage.setItem('assistant_interacted', 'true');
  }, []);

  return {
    settings,
    loading,
    isEnabled: isEnabled(),
    isOpen,
    showProactive,
    conversationId,
    messages,
    messagesLoading,
    isMobile,
    open,
    close,
    dismissProactive,
    sendMessage,
    updateConversation,
    getOrCreateConversation,
  };
}
