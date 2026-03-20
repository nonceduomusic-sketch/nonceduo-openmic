import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FormatKey } from './useFormatGating';

const PIN_SESSION_STORAGE_KEY = 'ncd_pin_sessions_v2';

interface StoredSession {
  token: string;
  liveSessionId: string;
  pinCodeHash: string; // Hash del PIN per identificare sessioni con stesso PIN
  createdAt: string;
}

/**
 * Hook per gestire le sessioni PIN GLOBALI condivise tra format.
 * 
 * LOGICA AGGIORNATA:
 * - La sessione è legata al live_session_id (NOT al format specifico)
 * - PIN corretto su UN format → accesso a TUTTI i format con stesso PIN
 * - Esempio: entra Open Mic con PIN → Dediche (stesso PIN) = accesso diretto
 * - Cambio PIN → invalida sessione globale (tutti i format richiedono nuovo PIN)
 */
export function usePinSession(format: FormatKey) {
  const [hasValidSession, setHasValidSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionInvalidated, setSessionInvalidated] = useState(false);
  const [invalidationReason, setInvalidationReason] = useState<string | null>(null);

  // Get stored global session from localStorage
  const getStoredSession = useCallback((): StoredSession | null => {
    try {
      const stored = localStorage.getItem(PIN_SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Save global session to localStorage
  const saveSession = useCallback((session: StoredSession) => {
    localStorage.setItem(PIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  }, []);

  // Remove session from localStorage
  const removeSession = useCallback(() => {
    localStorage.removeItem(PIN_SESSION_STORAGE_KEY);
  }, []);

  // Simple hash function for PIN comparison
  const hashPin = useCallback((pin: string): string => {
    const cleanPin = pin.toUpperCase().trim();
    // Simple hash for client-side comparison (not cryptographic, just for matching)
    let hash = 0;
    for (let i = 0; i < cleanPin.length; i++) {
      const char = cleanPin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }, []);

  // Validate existing session with server for THIS format
  // The session is GLOBAL - if valid for one format, it's valid for ALL formats sharing the same live session
  const validateStoredSession = useCallback(async (): Promise<boolean> => {
    const stored = getStoredSession();
    if (!stored) {
      return false;
    }

    try {
      // 1) Validate the referenced live session first (public table, cheap check)
      const { data: liveSession, error: liveError } = await supabase
        .from('live_sessions')
        .select('id, protected_formats, is_active, expires_at')
        .eq('id', stored.liveSessionId)
        .maybeSingle();

      if (liveError || !liveSession) {
        if (import.meta.env.DEV) console.warn('[PinSession] Live session not active:', stored.liveSessionId);
        removeSession();
        return false;
      }

      if (!liveSession.is_active) {
        if (import.meta.env.DEV) console.warn('[PinSession] Live session deactivated');
        removeSession();
        return false;
      }

      // Check expiration
      if (liveSession.expires_at && new Date(liveSession.expires_at) < new Date()) {
        if (import.meta.env.DEV) console.warn('[PinSession] Live session expired');
        removeSession();
        return false;
      }

      // Check if this format is protected by the live session
      const protectedFormats = liveSession.protected_formats as string[] | null;
      if (!protectedFormats?.includes(format)) {
        // Format is NOT protected by this session = doesn't need PIN = let through
        if (import.meta.env.DEV) console.log(`[PinSession] Format ${format} not protected, no PIN needed`);
        // IMPORTANT: don't delete the stored session here, it may still be used for other formats.
        return false;
      }

      // 2) Now validate the token via backend RPC (avoids RLS issues on pin_sessions)
      const { data: validationRows, error: validationError } = await supabase.rpc('validate_pin_session', {
        p_token: stored.token,
        p_format: format,
      });

      if (validationError) {
        if (import.meta.env.DEV) console.error('[PinSession] validate_pin_session error:', validationError);
        // Transient failure: don't remove the session, just treat as not validated right now.
        return false;
      }

      const row = Array.isArray(validationRows) ? validationRows[0] : (validationRows as any);
      const isValid = Boolean(row?.is_valid);

      if (!isValid) {
        if (import.meta.env.DEV) console.warn('[PinSession] Token invalid for protected format:', stored.token?.substring(0, 8));
        removeSession();
        return false;
      }

      // Session is valid and format is protected - user has access!
      if (import.meta.env.DEV) console.log(`[PinSession] Valid global session for ${format}, live_session:`, liveSession.id);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('[PinSession] Error validating session:', error);
      // Don't remove session on transient errors - just return false
      return false;
    }
  }, [format, getStoredSession, removeSession]);

  // Create new GLOBAL session after PIN validation (works for ALL formats with same PIN)
  const createSession = useCallback(async (liveSessionId: string, pinCode: string): Promise<boolean> => {
    try {
      // Create session without format-specific binding
      // The format is still passed for logging but session is global
      const { data: token, error } = await supabase.rpc('create_pin_session', {
        p_live_session_id: liveSessionId,
        p_format: format, // Per logging/audit, ma sessione è globale
        p_pin_code: pinCode.toUpperCase().trim(),
        p_device_fingerprint: navigator.userAgent.substring(0, 100)
      });

      if (error) {
        console.error('[PinSession] Error creating session:', {
          format,
          liveSessionId,
          message: (error as any)?.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
        });
        return false;
      }

      if (token) {
        const session: StoredSession = {
          token: token as string,
          liveSessionId,
          pinCodeHash: hashPin(pinCode),
          createdAt: new Date().toISOString()
        };
        saveSession(session);
        setHasValidSession(true);
        console.log('[PinSession] Global session created for live_session:', liveSessionId);
        return true;
      }

      console.error('[PinSession] create_pin_session returned empty token', {
        format,
        liveSessionId,
      });

      return false;
    } catch (error) {
      console.error('[PinSession] Error creating session:', error);
      return false;
    }
  }, [format, hashPin, saveSession]);

  // Clear session (on logout or manual clear)
  const clearSession = useCallback(() => {
    removeSession();
    setHasValidSession(false);
    setSessionInvalidated(false);
    setInvalidationReason(null);
  }, [removeSession]);

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
      .channel(`pin-session-global-${stored.token.substring(0, 8)}`)
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
            console.log('[PinSession] Global session invalidated:', newRecord.invalidation_reason);
            setHasValidSession(false);
            setSessionInvalidated(true);
            setInvalidationReason(newRecord.invalidation_reason || 'unknown');
            removeSession();
          }
        }
      )
      .subscribe();

    // Also subscribe to live_sessions changes (PIN change, deactivation, mass invalidation)
    const liveChannel = supabase
      .channel(`live-session-change-global-${stored.liveSessionId.substring(0, 8)}-${Date.now()}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'live_sessions',
          filter: `id=eq.${stored.liveSessionId}`
        },
        (payload) => {
          const prev = payload.old as { 
            is_active?: boolean; 
            sessions_invalidated_at?: string | null;
            pin_code?: string;
          };
          const next = payload.new as { 
            is_active?: boolean; 
            expires_at?: string | null;
            sessions_invalidated_at?: string | null;
            pin_code?: string;
          };

          // Check if sessions were mass-invalidated (admin clicked "Sconnetti tutti")
          if (next?.sessions_invalidated_at && 
              next.sessions_invalidated_at !== prev?.sessions_invalidated_at) {
            console.log('[PinSession] Admin invalidated all sessions -> forcing re-auth');
            setHasValidSession(false);
            setSessionInvalidated(true);
            setInvalidationReason('admin_reset');
            removeSession();
            return;
          }

          // Check if PIN was changed
          if (next?.pin_code && prev?.pin_code && next.pin_code !== prev.pin_code) {
            console.log('[PinSession] PIN changed -> invalidate');
            setHasValidSession(false);
            setSessionInvalidated(true);
            setInvalidationReason('pin_changed');
            removeSession();
            return;
          }

          if (next?.is_active === false) {
            console.log('[PinSession] Live session deactivated -> invalidate');
            setHasValidSession(false);
            setSessionInvalidated(true);
            setInvalidationReason('session_deactivated');
            removeSession();
            return;
          }

          if (next?.expires_at && new Date(next.expires_at) < new Date()) {
            console.log('[PinSession] Live session expired -> invalidate');
            setHasValidSession(false);
            setSessionInvalidated(true);
            setInvalidationReason('session_expired');
            removeSession();
            return;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(liveChannel);
    };
    // IMPORTANT: Only depend on stable references, NOT on hasValidSession
    // to prevent channel re-subscription which could miss invalidation events
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStoredSession, removeSession]);

  // Fallback cross-device invalidation: some devices/tablets can miss realtime updates
  // when the browser is backgrounded or power-saving pauses the connection.
  // Revalidate on focus/visibility, on user interactions, and on a short interval.
  useEffect(() => {
    if (!hasValidSession) return;

    let cancelled = false;
    let consecutiveErrors = 0;

    const revalidateAccess = async () => {
      const stored = getStoredSession();
      if (!stored) {
        if (!cancelled) {
          setHasValidSession(false);
          setSessionInvalidated(true);
          setInvalidationReason('session_missing');
        }
        return;
      }

      try {
        const { data: validationRows, error: validationError } = await supabase.rpc('validate_pin_session', {
          p_token: stored.token,
          p_format: format,
        });

        if (validationError) {
          consecutiveErrors++;
          if (import.meta.env.DEV) console.error('[PinSession] Fallback validation error:', validationError, `(attempt ${consecutiveErrors})`);
          // After 5 consecutive errors, treat as invalidated (connection likely broken)
          if (consecutiveErrors >= 5 && !cancelled) {
            console.warn('[PinSession] Too many consecutive errors, forcing invalidation');
            setHasValidSession(false);
            setSessionInvalidated(true);
            setInvalidationReason('connection_lost');
            removeSession();
          }
          return;
        }

        // Reset error counter on successful call
        consecutiveErrors = 0;

        const row = Array.isArray(validationRows) ? validationRows[0] : (validationRows as any);
        const isValid = Boolean(row?.is_valid);

        if (!isValid && !cancelled) {
          if (import.meta.env.DEV) console.warn('[PinSession] Fallback invalidation detected');
          setHasValidSession(false);
          setSessionInvalidated(true);
          setInvalidationReason('admin_reset');
          removeSession();
        }
      } catch (error) {
        consecutiveErrors++;
        if (import.meta.env.DEV) console.error('[PinSession] Fallback revalidation error:', error);
        if (consecutiveErrors >= 5 && !cancelled) {
          setHasValidSession(false);
          setSessionInvalidated(true);
          setInvalidationReason('connection_lost');
          removeSession();
        }
      }
    };

    const handleFocus = () => {
      void revalidateAccess();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void revalidateAccess();
      }
    };

    // Revalidate on user interaction (catches cases where setInterval is throttled on mobile)
    let lastInteractionCheck = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttle to max once every 3 seconds
      if (now - lastInteractionCheck < 3000) return;
      lastInteractionCheck = now;
      void revalidateAccess();
    };

    // Poll every 3 seconds (was 5s - more aggressive for reliability)
    const interval = window.setInterval(() => {
      void revalidateAccess();
    }, 3000);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Touch/click events catch throttled intervals on mobile/tablet
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });
    document.addEventListener('click', handleUserInteraction, { passive: true });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [format, getStoredSession, hasValidSession, removeSession]);

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
        console.error('[PinSessionReset] Error resetting sessions:', error);
        return 0;
      }

      return (data as number) || 0;
    } catch (error) {
      console.error('[PinSessionReset] Error resetting sessions:', error);
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
        console.error('[PinSessionReset] Error counting sessions:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[PinSessionReset] Error counting sessions:', error);
      return 0;
    }
  }, []);

  return {
    resetting,
    resetAllSessions,
    countActiveSessions,
  };
}
