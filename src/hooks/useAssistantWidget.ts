import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { safeGetItem, safeRemoveItem, safeSetItem } from '@/lib/safeStorage';

export interface AssistantSettings {
  is_enabled: boolean;
  enabled_on_site: boolean;
  enabled_on_openmic: boolean;
  enabled_on_dediche: boolean;
  enabled_on_community: boolean;
  proactive_delay_seconds: number;
  welcome_message: string;
  // Welcome message visibility per section
  welcome_on_site: boolean;
  welcome_on_openmic: boolean;
  welcome_on_dediche: boolean;
  welcome_on_community: boolean;
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

type Section = 'site' | 'app' | 'openmic' | 'dediche' | 'community' | 'giochi' | 'furore';

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
  const sessionIdRef = useRef<string | null>(null);

  const callAssistantUserApi = useCallback(
    async <T,>(action: string, data: Record<string, unknown>): Promise<T> => {
      const res = await supabase.functions.invoke('assistant-user-chat', {
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

  // Get or create session ID
  const getSessionId = useCallback(() => {
    // Keep stable across refresh + (best-effort) across tabs.
    // Some browsers can throw on storage access (e.g. iOS Safari private mode).
    if (sessionIdRef.current) return sessionIdRef.current;

    let sessionId = safeGetItem('session', SESSION_KEY) || safeGetItem('local', SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    sessionIdRef.current = sessionId;
    safeSetItem('session', SESSION_KEY, sessionId);
    safeSetItem('local', SESSION_KEY, sessionId);
    return sessionId;
  }, []);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('assistant_public_settings')
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
      const storedConvId = safeGetItem('local', STORAGE_KEY);
      if (!storedConvId) return;

      try {
        const sessionId = getSessionId();
        const restored = await callAssistantUserApi<{ conversation_id: string | null }>(
          'restoreConversation',
          { session_id: sessionId, conversation_id: storedConvId }
        );

        if (restored?.conversation_id) {
          setConversationId(restored.conversation_id);
          safeSetItem('local', STORAGE_KEY, restored.conversation_id);
        } else {
          safeRemoveItem('local', STORAGE_KEY);
        }
      } catch (err) {
        console.error('Error restoring conversation:', err);
        // Keep localStorage intact on transient errors; we'll retry when user opens the widget.
      }
    };

    restoreConversation();
  }, [callAssistantUserApi, getSessionId]);

  const fetchMessages = useCallback(
    async (opts?: { markRead?: boolean }) => {
      if (!conversationId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      try {
        const sessionId = getSessionId();
        const res = await callAssistantUserApi<{ messages: AssistantMessage[] }>('fetchMessages', {
          session_id: sessionId,
          conversation_id: conversationId,
          mark_read: opts?.markRead ?? false,
        });

        setMessages((res?.messages || []) as AssistantMessage[]);
      } catch (err) {
        console.error('Error fetching messages (assistant-user-chat):', err);
      } finally {
        setMessagesLoading(false);
      }
    },
    [callAssistantUserApi, conversationId, getSessionId]
  );

  // Initial fetch + when open state changes (read receipts)
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    fetchMessages({ markRead: isOpen });
  }, [conversationId, isOpen, fetchMessages]);

  // Polling while open (Realtime is unreliable for session-based access)
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    const interval = setInterval(() => {
      fetchMessages({ markRead: true });
    }, 2000);

    return () => clearInterval(interval);
  }, [conversationId, isOpen, fetchMessages]);

  // NOTE: we intentionally avoid relying on Realtime here.
  // For anonymous/session-based access, Realtime filters can be unreliable.
  // Polling above is the source of truth.
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [conversationId]);

  // Check if assistant is enabled for current section
  const isEnabled = useCallback(() => {
    if (!settings || !settings.is_enabled) return false;

    switch (currentSection) {
      case 'site':
        return settings.enabled_on_site;
      case 'app':
        return (settings as any).enabled_on_app ?? true;
      case 'openmic':
        return settings.enabled_on_openmic;
      case 'dediche':
        return settings.enabled_on_dediche;
      case 'community':
        return settings.enabled_on_community;
      case 'giochi':
        return (settings as any).enabled_on_giochi ?? true;
      case 'furore':
        return (settings as any).enabled_on_furore ?? true;
      default:
        return false;
    }
  }, [settings, currentSection]);

  // Check if welcome message should be shown for current section
  const shouldShowWelcome = useCallback(() => {
    if (!settings) return false;

    switch (currentSection) {
      case 'site':
        return settings.welcome_on_site ?? true;
      case 'openmic':
        return settings.welcome_on_openmic ?? true;
      case 'dediche':
        return settings.welcome_on_dediche ?? true;
      case 'community':
        return settings.welcome_on_community ?? true;
      default:
        return true;
    }
  }, [settings, currentSection]);

  // Proactive opening disabled — the bubble is always visible but never auto-opens
  // Users must explicitly click the bubble to open the chat
  // (The old behaviour showed a proactive welcome card after a delay)

  // Create or get conversation
  const getOrCreateConversation = useCallback(async (
    userName?: string,
    userEmail?: string,
    leadType?: string
  ) => {
    if (conversationId) return conversationId;

    const sessionId = getSessionId();

    try {
      // Session-based restore via backend (reliable for anonymous users)
      try {
        const restored = await callAssistantUserApi<{ conversation_id: string | null }>(
          'restoreConversation',
          { session_id: sessionId }
        );
        if (restored?.conversation_id) {
          setConversationId(restored.conversation_id);
          safeSetItem('local', STORAGE_KEY, restored.conversation_id);
          return restored.conversation_id;
        }
      } catch (restoreErr) {
        // Non-fatal: we'll create a new conversation if restore fails
        console.warn('[assistant] restoreConversation failed, creating new:', restoreErr);
      }

      // Create new conversation
      const created = await callAssistantUserApi<{ conversation_id: string | null }>('createConversation', {
        session_id: sessionId,
        source_section: currentSection,
        source_url: window.location.href,
        user_name: userName,
        user_email: userEmail,
        lead_type: leadType,
      });

      if (!created?.conversation_id) {
        console.error('Error creating conversation: missing conversation_id');
        return null;
      }

      setConversationId(created.conversation_id);
      safeSetItem('local', STORAGE_KEY, created.conversation_id);
      return created.conversation_id;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, [conversationId, currentSection, getSessionId, callAssistantUserApi]);

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
      const sessionId = getSessionId();
      const res = await callAssistantUserApi<{ message: AssistantMessage }>('sendMessage', {
        session_id: sessionId,
        conversation_id: convId,
        sender_type: senderType,
        sender_name: senderName || (senderType === 'bot' ? 'Assistente' : 'Visitatore'),
        message_text: text,
        metadata: metadata || {},
      });

      const saved = res?.message;
      if (!saved?.id) {
        console.error('Error sending message: missing saved message');
        return null;
      }

      // Add message to local state immediately
      setMessages(prev => {
        if (prev.some(m => m.id === saved.id)) return prev;
        return [...prev, saved];
      });

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

      return saved;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, [conversationId, getOrCreateConversation, currentSection, callAssistantUserApi, getSessionId]);

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
      const sessionId = getSessionId();
      await callAssistantUserApi<{ ok: boolean }>('updateConversation', {
        session_id: sessionId,
        conversation_id: conversationId,
        updates,
      });
    } catch (err) {
      console.error('Error updating conversation:', err);
    }
  }, [conversationId, callAssistantUserApi, getSessionId]);

  const open = useCallback(() => {
    setIsOpen(true);
    setShowProactive(false);
    safeSetItem('session', 'assistant_interacted', 'true');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dismissProactive = useCallback(() => {
    setShowProactive(false);
    safeSetItem('session', 'assistant_interacted', 'true');
  }, []);

  return {
    settings,
    loading,
    isEnabled: isEnabled(),
    isOpen,
    showProactive,
    showWelcomeMessage: shouldShowWelcome(),
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
