import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  session_id: string;
  user_name: string;
  started_at: string;
}

export const useTypingIndicator = (
  conversationId: string | null,
  currentSessionId: string,
  currentUserName: string
) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Fetch current typing indicators
  const fetchTypingIndicators = useCallback(async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from('typing_indicators')
      .select('session_id, user_name, started_at')
      .eq('conversation_id', conversationId)
      .neq('session_id', currentSessionId)
      .gt('expires_at', new Date().toISOString());

    if (!error && data) {
      setTypingUsers(data);
    }
  }, [conversationId, currentSessionId]);

  // Update typing indicator (debounced)
  const updateTypingIndicator = useCallback(async () => {
    if (!conversationId || !currentSessionId || !currentUserName) return;

    // Debounce: don't update more than once every 2 seconds
    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) return;
    lastUpdateRef.current = now;

    try {
      // Upsert typing indicator
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          session_id: currentSessionId,
          user_name: currentUserName,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10000).toISOString(), // 10 seconds
        }, {
          onConflict: 'conversation_id,session_id'
        });
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }

    // Clear typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      clearTypingIndicator();
    }, 3000);
  }, [conversationId, currentSessionId, currentUserName]);

  // Clear typing indicator
  const clearTypingIndicator = useCallback(async () => {
    if (!conversationId || !currentSessionId) return;

    try {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('session_id', currentSessionId);
    } catch (error) {
      console.error('Error clearing typing indicator:', error);
    }
  }, [conversationId, currentSessionId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!conversationId) {
      setTypingUsers([]);
      return;
    }

    fetchTypingIndicators();

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchTypingIndicators();
        }
      )
      .subscribe();

    // Periodic cleanup of expired indicators
    const cleanupInterval = setInterval(() => {
      setTypingUsers(prev => 
        prev.filter(u => {
          const expiresAt = new Date(u.started_at).getTime() + 10000;
          return expiresAt > Date.now();
        })
      );
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
      clearTypingIndicator();
    };
  }, [conversationId, fetchTypingIndicators, clearTypingIndicator]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    updateTypingIndicator,
    clearTypingIndicator,
    isAnyoneTyping: typingUsers.length > 0,
    typingNames: typingUsers.map(u => u.user_name),
  };
};
