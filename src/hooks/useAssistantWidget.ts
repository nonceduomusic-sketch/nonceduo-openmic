import { useState, useEffect, useCallback } from 'react';
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

type Section = 'site' | 'openmic' | 'dediche' | 'community';

export function useAssistantWidget(currentSection: Section = 'site') {
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showProactive, setShowProactive] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

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
      // Check if user has already interacted (stored in sessionStorage)
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

    // Get session ID from header or generate one
    let sessionId = sessionStorage.getItem('assistant_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('assistant_session_id', sessionId);
    }

    try {
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
      return data.id;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, [conversationId, currentSection]);

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
        } as never)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return null;
      }

      // Update conversation
      await supabase
        .from('assistant_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

      return data;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  }, [conversationId, getOrCreateConversation]);

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
    isMobile,
    open,
    close,
    dismissProactive,
    sendMessage,
    updateConversation,
    getOrCreateConversation,
  };
}
