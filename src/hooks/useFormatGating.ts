import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FormatKey = 'openmic' | 'dediche';

interface FormatGatingState {
  // Is the format globally active (enabled by admin in "Format attivi")?
  isGloballyActive: boolean;
  // Is the format currently in a live session (section_settings.is_enabled)?
  isLiveSessionActive: boolean;
  // Does the format require PIN for this live session?
  requiresPin: boolean;
  // Combined state
  loading: boolean;
}

/**
 * Hook per determinare lo stato di gating di un format.
 * 
 * LOGICA CORRETTA:
 * 1. Se format NON ATTIVO globalmente (isGloballyActive=false) → mostra TEASER
 * 2. Se format ATTIVO globalmente:
 *    - Se NON c'è sessione live attiva → accesso diretto al LIVE (format attivo = pubblico)
 *    - Se c'è sessione live attiva:
 *      - Se format NON è in protected_formats → accesso diretto al LIVE
 *      - Se format È in protected_formats → mostra schermata PIN
 * 
 * In pratica: global_format_settings.is_active = true significa che il format è accessibile.
 * La sessione live con PIN è un EXTRA di protezione, non un requisito.
 */
export function useFormatGating(format: FormatKey): FormatGatingState & {
  getGatingDecision: () => 'teaser' | 'live' | 'pin-required';
} {
  const [isGloballyActive, setIsGloballyActive] = useState(true);
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkGating = useCallback(async () => {
    try {
      // 1. Check global format settings (Format attivi in Centro)
      const { data: globalSettings } = await supabase
        .from('global_format_settings')
        .select('is_active')
        .eq('format_key', format)
        .maybeSingle();

      // Default to FALSE if not found - safer to show teaser than fake "live" state
      const globalActive = globalSettings?.is_active ?? false;
      setIsGloballyActive(globalActive);

      // 2. Check live_sessions table - this determines if PIN is required
      // PIN is only required if there's an active session AND format is in protected_formats
      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('id, protected_formats, expires_at')
        .eq('is_active', true)
        .maybeSingle();

      let sessionActive = false;
      let needsPin = false;

      if (liveSession) {
        // Check expiration
        const isExpired = liveSession.expires_at && new Date(liveSession.expires_at) < new Date();
        if (!isExpired) {
          sessionActive = true;
          const protectedFormats = (liveSession.protected_formats as string[]) || [];
          // PIN is required ONLY if the format is explicitly in the protected_formats array
          needsPin = protectedFormats.includes(format);
        }
      }

      setIsLiveSessionActive(sessionActive);
      setRequiresPin(needsPin);

    } catch (error) {
      console.error('Error checking format gating:', error);
      // Fail safe: show live if globally active (don't block users on error)
      setIsGloballyActive(true);
      setIsLiveSessionActive(false);
      setRequiresPin(false);
    } finally {
      setLoading(false);
    }
  }, [format]);

  useEffect(() => {
    checkGating();

    // Subscribe to realtime changes
    const channels = [
      supabase.channel(`gating-global-${format}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'global_format_settings' }, checkGating)
        .subscribe(),
      supabase.channel(`gating-live-${format}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, checkGating)
        .subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [format, checkGating]);

  /**
   * Determina quale schermata mostrare:
   * - 'teaser': pagina promozionale (format disattivato globalmente)
   * - 'live': accesso diretto al contenuto live
   * - 'pin-required': mostra form inserimento PIN (solo se in protected_formats)
   */
  const getGatingDecision = useCallback((): 'teaser' | 'live' | 'pin-required' => {
    // Se format non globalmente attivo → teaser
    if (!isGloballyActive) return 'teaser';
    
    // Format è globalmente attivo!
    // Controlla se c'è una sessione live con PIN per questo format
    if (isLiveSessionActive && requiresPin) return 'pin-required';
    
    // Format attivo (con o senza sessione live, senza PIN) → accesso diretto
    return 'live';
  }, [isGloballyActive, isLiveSessionActive, requiresPin]);

  return {
    isGloballyActive,
    isLiveSessionActive,
    requiresPin,
    loading,
    getGatingDecision,
  };
}

/**
 * Hook per validare il PIN inserito dall'utente
 */
export function useFormatPinValidator(format: FormatKey) {
  const [validating, setValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const validatePin = async (pin: string): Promise<boolean> => {
    setValidating(true);
    setIsValid(null);

    try {
      // OFFLINE-FIRST: when served from the local mini-server, try local
      // validation first so it works even without Internet.
      try {
        const { isLocalServerAvailable, localValidatePin } = await import('@/lib/localPinAuth');
        if (isLocalServerAvailable()) {
          const local = await localValidatePin(pin.toUpperCase().trim(), format);
          if (local?.ok) {
            setIsValid(true);
            return true;
          }
          // If the local server explicitly rejected the PIN (and we have no
          // internet), don't fall through — surface the rejection.
          if (local && !local.ok && !navigator.onLine) {
            setIsValid(false);
            return false;
          }
          // local server unreachable OR rejected but we still have internet → try cloud
        }
      } catch {
        // local helper failed, fall through to cloud
      }

      // Use secure RPC function instead of reading pin_code directly
      // This prevents client-side exposure of PIN codes
      const { data: isValid, error } = await supabase.rpc('validate_live_session_pin', {
        p_section: format,
        p_pin: pin.toUpperCase().trim()
      });

      if (error) {
        // Check if it's a rate limit error
        if (error.message?.includes('Troppi tentativi')) {
          console.warn('Rate limit exceeded for PIN validation');
          setIsValid(false);
          return false;
        }
        throw error;
      }

      // RPC returns boolean directly
      const valid = isValid === true;
      setIsValid(valid);

      return valid;
    } catch (error) {
      console.error('Error validating PIN:', error);
      setIsValid(false);
      return false;
    } finally {
      setValidating(false);
    }
  };

  const reset = () => {
    setIsValid(null);
    setValidating(false);
  };

  return { validatePin, validating, isValid, reset };
}
