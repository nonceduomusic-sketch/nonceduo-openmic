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
  // The session is global, but we validate it can access this specific format
  const validateStoredSession = useCallback(async (): Promise<boolean> => {
    const stored = getStoredSession();
    if (!stored) {
      return false;
    }

    try {
      // Validate the global session token
      const { data, error } = await supabase.rpc('validate_pin_session', {
        p_token: stored.token,
        p_format: format // Il formato viene verificato per sicurezza
      });

      if (error) {
        console.error('[PinSession] Error validating session:', {
          format,
          tokenPrefix: stored.token?.substring(0, 8),
          message: (error as any)?.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
        });
        
        // Se l'errore è perché il formato non corrisponde, proviamo una validazione globale
        // chiamando la funzione senza filtro formato o verificando il live_session direttamente
        const { data: liveCheck, error: liveError } = await supabase
          .from('live_sessions')
          .select('id, pin_code, protected_formats, is_active, expires_at')
          .eq('id', stored.liveSessionId)
          .eq('is_active', true)
          .maybeSingle();

        if (liveError || !liveCheck) {
          removeSession();
          return false;
        }

        // Check if format is protected by this live session
        const protectedFormats = liveCheck.protected_formats as string[] | null;
        if (!protectedFormats?.includes(format)) {
          // Format not protected by this session, but that's OK - might not need PIN
          return false;
        }

        // Check if session token is still valid in pin_sessions
        const { data: pinSession, error: pinError } = await supabase
          .from('pin_sessions')
          .select('is_valid, invalidation_reason')
          .eq('session_token', stored.token)
          .eq('is_valid', true)
          .maybeSingle();

        if (pinError || !pinSession) {
          removeSession();
          return false;
        }

        return true;
      }

      // RPC returns array, get first result
      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        console.warn('[PinSession] validate_pin_session returned no rows', {
          format,
          tokenPrefix: stored.token?.substring(0, 8),
        });
        removeSession();
        return false;
      }
      
      if (result?.is_valid) {
        // Verify the format is still protected by the same PIN/live session
        const protectedFormats = result.protected_formats as string[] | null;
        if (protectedFormats && !protectedFormats.includes(format)) {
          console.warn('[PinSession] PIN session mismatch: token valid but format not in protected_formats', {
            format,
            protectedFormats,
            tokenPrefix: stored.token?.substring(0, 8),
          });
          // In questo caso NON blocchiamo: se il format non è più protetto, la UI entrerà comunque via gating.
        }
        return true;
      } else {
        removeSession();
        return false;
      }
    } catch (error) {
      console.error('[PinSession] Error validating session:', error);
      removeSession();
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

    // Also subscribe to live_sessions changes (PIN change, deactivation)
    const liveChannel = supabase
      .channel(`live-session-change-global-${stored.liveSessionId.substring(0, 8)}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_sessions',
          filter: `id=eq.${stored.liveSessionId}`
        },
        async (payload) => {
          console.log('[PinSession] Live session changed:', payload.eventType);
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
  }, [getStoredSession, hasValidSession, removeSession, validateStoredSession]);

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
