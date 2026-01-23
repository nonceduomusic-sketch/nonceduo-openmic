import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FormatKey } from './useFormatGating';

const PIN_SESSION_STORAGE_KEY = 'ncd_pin_sessions';

interface StoredSession {
  token: string;
  format: FormatKey;
  liveSessionId: string;
  createdAt: string;
}

interface SessionStorage {
  [format: string]: StoredSession;
}

/**
 * Hook per gestire le sessioni PIN persistenti.
 * 
 * LOGICA:
 * - Dopo PIN corretto → crea sessione server + salva token in localStorage
 * - Utente chiude browser e rientra → valida sessione esistente
 * - Sessione scade se: format chiude, owner cambia PIN, o owner resetta manualmente
 * - Real-time: riceve notifiche quando sessione invalidata
 */
export function usePinSession(format: FormatKey) {
  const [hasValidSession, setHasValidSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionInvalidated, setSessionInvalidated] = useState(false);
  const [invalidationReason, setInvalidationReason] = useState<string | null>(null);

  // Get stored sessions from localStorage
  const getStoredSessions = useCallback((): SessionStorage => {
    try {
      const stored = localStorage.getItem(PIN_SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  // Save session to localStorage
  const saveSession = useCallback((session: StoredSession) => {
    const sessions = getStoredSessions();
    sessions[session.format] = session;
    localStorage.setItem(PIN_SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }, [getStoredSessions]);

  // Remove session from localStorage
  const removeSession = useCallback((formatKey: FormatKey) => {
    const sessions = getStoredSessions();
    delete sessions[formatKey];
    localStorage.setItem(PIN_SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }, [getStoredSessions]);

  // Get current session for format
  const getStoredSession = useCallback((): StoredSession | null => {
    const sessions = getStoredSessions();
    return sessions[format] || null;
  }, [format, getStoredSessions]);

  // Validate existing session with server
  const validateStoredSession = useCallback(async (): Promise<boolean> => {
    const stored = getStoredSession();
    if (!stored) {
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('validate_pin_session', {
        p_token: stored.token,
        p_format: format
      });

      if (error) {
        console.error('Error validating session:', error);
        removeSession(format);
        return false;
      }

      // RPC returns array, get first result
      const result = Array.isArray(data) ? data[0] : data;
      
      if (result?.is_valid) {
        return true;
      } else {
        removeSession(format);
        return false;
      }
    } catch (error) {
      console.error('Error validating session:', error);
      removeSession(format);
      return false;
    }
  }, [format, getStoredSession, removeSession]);

  // Create new session after PIN validation
  const createSession = useCallback(async (liveSessionId: string, pinCode: string): Promise<boolean> => {
    try {
      const { data: token, error } = await supabase.rpc('create_pin_session', {
        p_live_session_id: liveSessionId,
        p_format: format,
        p_pin_code: pinCode.toUpperCase().trim(),
        p_device_fingerprint: navigator.userAgent.substring(0, 100)
      });

      if (error) {
        console.error('Error creating session:', error);
        return false;
      }

      if (token) {
        const session: StoredSession = {
          token: token as string,
          format,
          liveSessionId,
          createdAt: new Date().toISOString()
        };
        saveSession(session);
        setHasValidSession(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
  }, [format, saveSession]);

  // Clear session (on logout or manual clear)
  const clearSession = useCallback(() => {
    removeSession(format);
    setHasValidSession(false);
    setSessionInvalidated(false);
    setInvalidationReason(null);
  }, [format, removeSession]);

  // Check session validity on mount
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      const isValid = await validateStoredSession();
      setHasValidSession(isValid);
      setLoading(false);
    };

    checkSession();
  }, [validateStoredSession]);

  // Subscribe to realtime session invalidation
  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) return;

    // Subscribe to pin_sessions changes for this token
    const channel = supabase
      .channel(`pin-session-${format}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'pin_sessions',
          filter: `session_token=eq.${stored.token}`
        },
        (payload) => {
          const newRecord = payload.new as { is_valid: boolean; invalidation_reason?: string };
          if (!newRecord.is_valid) {
            console.log('[PinSession] Session invalidated:', newRecord.invalidation_reason);
            setHasValidSession(false);
            setSessionInvalidated(true);
            setInvalidationReason(newRecord.invalidation_reason || 'unknown');
            removeSession(format);
          }
        }
      )
      .subscribe();

    // Also subscribe to live_sessions changes
    const liveChannel = supabase
      .channel(`live-session-change-${format}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_sessions',
          filter: `id=eq.${stored.liveSessionId}`
        },
        async () => {
          // Re-validate session when live session changes
          const isValid = await validateStoredSession();
          if (!isValid && hasValidSession) {
            setHasValidSession(false);
            setSessionInvalidated(true);
            setInvalidationReason('session_changed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(liveChannel);
    };
  }, [format, getStoredSession, hasValidSession, removeSession, validateStoredSession]);

  return {
    hasValidSession,
    loading,
    sessionInvalidated,
    invalidationReason,
    createSession,
    clearSession,
    validateStoredSession,
  };
}

/**
 * Hook per resettare tutte le sessioni PIN (admin only)
 */
export function useAdminPinSessionReset() {
  const [resetting, setResetting] = useState(false);

  const resetAllSessions = useCallback(async (liveSessionId: string, reason: string = 'admin_reset'): Promise<number> => {
    setResetting(true);
    try {
      const { data, error } = await supabase.rpc('invalidate_pin_sessions', {
        p_live_session_id: liveSessionId,
        p_reason: reason
      });

      if (error) {
        console.error('Error resetting sessions:', error);
        return 0;
      }

      return (data as number) || 0;
    } catch (error) {
      console.error('Error resetting sessions:', error);
      return 0;
    } finally {
      setResetting(false);
    }
  }, []);

  const countActiveSessions = useCallback(async (liveSessionId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('pin_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('live_session_id', liveSessionId)
        .eq('is_valid', true);

      if (error) {
        console.error('Error counting sessions:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting sessions:', error);
      return 0;
    }
  }, []);

  return {
    resetting,
    resetAllSessions,
    countActiveSessions,
  };
}
